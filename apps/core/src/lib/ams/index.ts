/**
 * AMS adapter factory.
 *
 * Loads a tenant's stored AMS connection, decrypts the password, and returns
 * the matching adapter. Reads through `adminDb()` deliberately: the telephony
 * webhook is not a trusted tenant session — it is authenticated by its signing
 * secret, then needs the AMS credentials to do the screen-pop lookup.
 */
import { adminDb, tenantAmsConnections } from "@prismcore/db";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/crypto";
import { AMS360Adapter } from "./ams360";
import { HawkSoftAdapter } from "./hawksoft";
import { AppliedEpicAdapter } from "./applied-epic";
import { EZLynxAdapter } from "./ezlynx";
import type { AMSAdapter, AMSCredentials } from "./types";

export type { AMSAdapter, AMSContact, AMSActivityNote, AMSCredentials } from "./types";
export { AMS360Adapter } from "./ams360";
export { HawkSoftAdapter } from "./hawksoft";
export { AppliedEpicAdapter } from "./applied-epic";
export { EZLynxAdapter } from "./ezlynx";

/** The AMS systems Prism Core can sync calls into. */
export interface AmsProvider {
  id: string;
  name: string;
  description: string;
}

export const AMS_PROVIDERS: AmsProvider[] = [
  {
    id: "ams360",
    name: "AMS360",
    description: "Vertafore AMS360 — WSAPI v3. Screen pop + activity notes.",
  },
  {
    id: "hawksoft",
    name: "HawkSoft",
    description:
      "HawkSoft Partner API. Screen pop via synced client index + log notes.",
  },
  {
    id: "applied_epic",
    name: "Applied Epic",
    description:
      "Applied Epic API Suite. Real-time screen pop + activity notes.",
  },
  {
    id: "ezlynx",
    name: "EZLynx",
    description:
      "EZLynx API. Screen pop via synced applicant index. No note API.",
  },
];

/** A tenant's AMS connection, decrypted, as the UI and webhook consume it. */
export interface AmsConnection {
  provider: string;
  endpoint: string;
  username: string;
  password: string;
  employeeCode: string;
  /** AMS360 web-portal tenant id used to build the screen-pop URL. */
  webTenantId: string;
  autoSyncCalls: boolean;
  screenPopEnabled: boolean;
}

/** Read + decrypt a tenant's AMS connection. `adminDb` — pre-auth context. */
export async function getAmsConnection(
  tenantId: string,
): Promise<AmsConnection | null> {
  const rows = await adminDb()
    .select()
    .from(tenantAmsConnections)
    .where(eq(tenantAmsConnections.tenantId, tenantId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const cfg = (row.config ?? {}) as Record<string, unknown>;
  return {
    provider: row.provider,
    endpoint: String(cfg.endpoint ?? ""),
    username: String(cfg.username ?? ""),
    password: decryptSecret(String(cfg.password ?? "")),
    employeeCode: String(cfg.employeeCode ?? ""),
    webTenantId: String(cfg.webTenantId ?? ""),
    autoSyncCalls: cfg.autoSyncCalls !== false,
    screenPopEnabled: cfg.screenPopEnabled !== false,
  };
}

/** Build the adapter for a tenant's AMS, or null if none is configured. */
export async function getAmsAdapter(
  tenantId: string,
): Promise<AMSAdapter | null> {
  const conn = await getAmsConnection(tenantId);
  if (!conn) return null;
  if (!conn.endpoint || !conn.username || !conn.password) return null;

  const credentials: AMSCredentials = {
    endpoint: conn.endpoint,
    username: conn.username,
    password: conn.password,
    employeeCode: conn.employeeCode || undefined,
  };

  switch (conn.provider) {
    case "ams360":
      return new AMS360Adapter(credentials);
    case "hawksoft":
      return new HawkSoftAdapter(credentials, tenantId);
    case "applied_epic":
      return new AppliedEpicAdapter(credentials);
    case "ezlynx":
      return new EZLynxAdapter(credentials, tenantId);
    default:
      return null;
  }
}

/**
 * Refresh the local phone index for an AMS that has no phone-search API
 * (HawkSoft). EZLynx is indexed incrementally from its applicant webhooks,
 * so there is nothing to bulk-sync here. Returns null when not applicable.
 */
export async function syncAmsPhoneIndex(
  tenantId: string,
): Promise<{ synced: number; errors: number } | null> {
  const adapter = await getAmsAdapter(tenantId);
  if (adapter instanceof HawkSoftAdapter) {
    return adapter.syncPhoneIndex();
  }
  return null;
}

/**
 * Refresh every HawkSoft tenant's phone index — the daily worker behind
 * `/api/cron/ams-index`. Runs as the platform worker (`adminDb`).
 */
export async function runAllPhoneIndexSync(): Promise<{
  tenants: number;
  synced: number;
  errors: number;
}> {
  const conns = await adminDb()
    .select({ tenantId: tenantAmsConnections.tenantId })
    .from(tenantAmsConnections)
    .where(eq(tenantAmsConnections.provider, "hawksoft"));

  const result = { tenants: conns.length, synced: 0, errors: 0 };
  for (const conn of conns) {
    try {
      const r = await syncAmsPhoneIndex(conn.tenantId);
      if (r) {
        result.synced += r.synced;
        result.errors += r.errors;
      }
    } catch (error) {
      result.errors++;
      console.error(
        `[ams-index] tenant ${conn.tenantId} sync failed:`,
        error,
      );
    }
  }
  return result;
}

/**
 * The AMS360 deep link to a customer record — the URL the screen pop opens.
 * `webTenantId` is the AMS360 web-portal id, which differs from the WSAPI
 * AgencyNo; we fall back to the AgencyNo when it has not been set separately.
 */
export function buildAms360CustomerUrl(
  conn: AmsConnection,
  customerSourceId: string,
): string | null {
  if (conn.provider !== "ams360" || !customerSourceId) return null;
  const webTenantId = conn.webTenantId || conn.endpoint;
  if (!webTenantId) return null;
  return `https://www.ams360.com/v${webTenantId}/NextGen/Customer/Detail/${customerSourceId}`;
}
