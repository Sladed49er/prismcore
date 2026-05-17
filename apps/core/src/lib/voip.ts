import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  adminDb,
  calls,
  tenantVoipConnections,
  type Call,
} from "@prismcore/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export interface VoipProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/** The phone systems PrismVoice can connect to. */
export const VOIP_PROVIDERS: VoipProvider[] = [
  { id: "zoom", name: "Zoom Phone", description: "Cloud phone built into Zoom.", icon: "phone" },
  { id: "ringcentral", name: "RingCentral", description: "Cloud PBX and unified communications.", icon: "phone-call" },
  { id: "dialpad", name: "Dialpad", description: "AI-native business phone.", icon: "phone" },
  { id: "goto", name: "GoTo Connect", description: "Cloud phone and meetings.", icon: "phone-call" },
  { id: "vonage", name: "Vonage Business", description: "Cloud communications platform.", icon: "phone" },
];

interface SampleCaller {
  from: string;
  contact: string | null;
  summary: string;
  disposition: string;
}

/** Plausible inbound calls for the screen-pop demo. */
const SAMPLE_CALLERS: SampleCaller[] = [
  { from: "+1 503-555-0142", contact: "Maria Delgado", summary: "Wants to add a vehicle to her auto policy and is asking for an updated quote by Friday.", disposition: "Quote requested" },
  { from: "+1 206-555-0188", contact: "Tom Becker", summary: "Asking why his homeowners renewal premium went up this year.", disposition: "Policy question" },
  { from: "+1 415-555-0173", contact: null, summary: "New prospect asking whether the agency writes general liability for a cannabis dispensary.", disposition: "New lead" },
  { from: "+1 360-555-0119", contact: "Janet Wu", summary: "Following up on the status of her open auto glass claim.", disposition: "Claim follow-up" },
  { from: "+1 509-555-0150", contact: null, summary: "Caller asking if the agency can write commercial trucking for a small fleet.", disposition: "New lead" },
];

/* Every function below runs through `withTenantContext` — the RLS-bound role
 * with the tenant GUC set, so calls and connections are isolated by Postgres. */

export async function listConnections(tenantId: string): Promise<string[]> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select({ providerId: tenantVoipConnections.providerId })
      .from(tenantVoipConnections)
      .where(eq(tenantVoipConnections.tenantId, tenantId)),
  );
  return rows.map((r) => r.providerId);
}

/** Provider credentials a tenant plugs in to wire up its phone system. */
export interface VoipCredentials {
  accountId: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
}

export interface VoipConnectionRow {
  providerId: string;
  credentials: VoipCredentials;
}

/** Read a stored config blob back into credentials, decrypting the secrets. */
function credentialsFromConfig(raw: unknown): VoipCredentials {
  const cfg = (raw ?? {}) as Record<string, string>;
  return {
    accountId: cfg.accountId ?? "",
    apiKey: cfg.apiKey ?? "",
    apiSecret: decryptSecret(cfg.apiSecret ?? ""),
    webhookSecret: decryptSecret(cfg.webhookSecret ?? ""),
  };
}

/** A tenant's VoIP connections with their stored credentials (decrypted). */
export async function listConnectionDetails(
  tenantId: string,
): Promise<VoipConnectionRow[]> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select({
        providerId: tenantVoipConnections.providerId,
        config: tenantVoipConnections.config,
      })
      .from(tenantVoipConnections)
      .where(eq(tenantVoipConnections.tenantId, tenantId)),
  );
  return rows.map((r) => ({
    providerId: r.providerId,
    credentials: credentialsFromConfig(r.config),
  }));
}

/**
 * Connect — or re-save credentials for — a VoIP provider. The two secret
 * fields (API secret, webhook signing secret) are encrypted at rest with
 * AES-256-GCM before they touch the database; account ID and API key are
 * identifiers and stay readable. Upserted, tenant-scoped, RLS-isolated.
 */
export async function connectProvider(
  tenantId: string,
  providerId: string,
  credentials: VoipCredentials,
): Promise<void> {
  const config: Record<string, unknown> = {
    accountId: credentials.accountId,
    apiKey: credentials.apiKey,
    apiSecret: encryptSecret(credentials.apiSecret),
    webhookSecret: encryptSecret(credentials.webhookSecret),
  };
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .insert(tenantVoipConnections)
      .values({ tenantId, providerId, config })
      .onConflictDoUpdate({
        target: [
          tenantVoipConnections.tenantId,
          tenantVoipConnections.providerId,
        ],
        set: { config },
      });
  });
}

export async function disconnectProvider(
  tenantId: string,
  providerId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(tenantVoipConnections)
      .where(
        and(
          eq(tenantVoipConnections.tenantId, tenantId),
          eq(tenantVoipConnections.providerId, providerId),
        ),
      );
  });
}

/**
 * Every webhook signing secret configured for a tenant, decrypted.
 *
 * Uses `adminDb()` deliberately: the inbound webhook is not a trusted tenant
 * session yet — it is being authenticated. The caller (the webhook route)
 * verifies the request signature against these before recording anything.
 */
export async function getTenantWebhookSecrets(
  tenantId: string,
): Promise<string[]> {
  const rows = await adminDb()
    .select({ config: tenantVoipConnections.config })
    .from(tenantVoipConnections)
    .where(eq(tenantVoipConnections.tenantId, tenantId));
  return rows
    .map((r) => {
      const cfg = (r.config ?? {}) as Record<string, string>;
      return decryptSecret(cfg.webhookSecret ?? "");
    })
    .filter((s) => s.length > 0);
}

export async function listCalls(tenantId: string, limit = 25): Promise<Call[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(calls)
      .where(eq(calls.tenantId, tenantId))
      .orderBy(desc(calls.occurredAt))
      .limit(limit),
  );
}

/** Record a call — used by the screen-pop webhook and by the demo simulator. */
export async function recordCall(input: {
  tenantId: string;
  direction?: "inbound" | "outbound";
  fromNumber: string;
  contactName?: string | null;
  durationSeconds?: number;
  aiSummary?: string | null;
  disposition?: string | null;
  provider?: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(calls).values({
      tenantId: input.tenantId,
      direction: input.direction ?? "inbound",
      fromNumber: input.fromNumber,
      contactName: input.contactName ?? null,
      durationSeconds: input.durationSeconds ?? 0,
      aiSummary: input.aiSummary ?? null,
      disposition: input.disposition ?? null,
      provider: input.provider ?? "manual",
    });
  });
}

/** Simulate an inbound call so the screen-pop and AI summary can be demoed. */
export async function simulateInboundCall(tenantId: string): Promise<void> {
  const caller =
    SAMPLE_CALLERS[Math.floor(Math.random() * SAMPLE_CALLERS.length)]!;
  await recordCall({
    tenantId,
    direction: "inbound",
    fromNumber: caller.from,
    contactName: caller.contact,
    durationSeconds: 60 + Math.floor(Math.random() * 540),
    aiSummary: caller.summary,
    disposition: caller.disposition,
    provider: "demo",
  });
}
