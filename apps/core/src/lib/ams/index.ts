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
import type { AMSAdapter, AMSCredentials } from "./types";

export type { AMSAdapter, AMSContact, AMSActivityNote, AMSCredentials } from "./types";
export { AMS360Adapter } from "./ams360";

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
    default:
      return null;
  }
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
