/**
 * Shared VoIP call-event pipeline.
 *
 * Every native carrier webhook (RingCentral, Zoom, GoTo, Vonage) translates
 * its provider payload into a `NormalizedCall` and hands it here. This is the
 * provider-agnostic half of the Dialpad route's logic: record the call,
 * AMS-match the caller when the call connects, and queue the AMS write-back
 * when it ends. Keeping it in one place means a new carrier is just a
 * normalizer plus a thin webhook route.
 */
import { normalizePhone } from "@/lib/phone";
import { upsertProviderCall, patchProviderCall } from "@/lib/voip";
import { getAmsAdapter, getAmsConnection } from "@/lib/ams";
import { markCallPendingAmsSync } from "@/lib/ams-sync";

/** A carrier call event, normalized to Prism Core's shape. */
export interface NormalizedCall {
  providerCallId: string;
  masterCallId: string | null;
  direction: "inbound" | "outbound";
  status: "ringing" | "in_progress" | "completed" | "missed" | "voicemail";
  fromNumber: string;
  toNumber: string;
  /** The customer's number — used for the AMS caller lookup. */
  externalNumber: string;
  agentName: string | null;
  agentEmail: string | null;
  durationSeconds: number;
  occurredAt: Date;
  recordingUrl: string | null;
}

/** Look the caller up in the tenant's AMS and tag the call with the match. */
async function matchCallContact(
  tenantId: string,
  providerCallId: string,
  externalNumber: string,
): Promise<void> {
  const normalized = normalizePhone(externalNumber);
  if (!normalized) return;
  const amsConn = await getAmsConnection(tenantId);
  if (!amsConn) return;

  try {
    const ams = await getAmsAdapter(tenantId);
    if (!ams) return;
    // Cap the lookup so a slow AMS never stalls the webhook.
    const matches = await Promise.race([
      ams.lookupByPhone(normalized),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AMS lookup timeout")), 5000),
      ),
    ]);
    const first = matches[0];
    if (!first) return;
    const name = first.fullName || first.companyName || normalized;
    await patchProviderCall(tenantId, providerCallId, {
      contactName: name,
      matchedContactId: first.sourceId,
      matchedContactName: name,
    });
  } catch (error) {
    console.error("[voip] AMS lookup failed:", error);
  }
}

/**
 * Record one normalized carrier call event. Idempotent — keyed by
 * `providerCallId`, so a webhook firing twice updates one row.
 */
export async function processProviderCall(
  tenantId: string,
  provider: string,
  call: NormalizedCall,
): Promise<void> {
  await upsertProviderCall({
    tenantId,
    providerCallId: call.providerCallId,
    masterCallId: call.masterCallId,
    direction: call.direction,
    status: call.status,
    fromNumber: call.fromNumber,
    toNumber: call.toNumber,
    agentName: call.agentName,
    agentEmail: call.agentEmail,
    durationSeconds: call.durationSeconds,
    provider,
    occurredAt: call.occurredAt,
  });

  if (call.recordingUrl) {
    await patchProviderCall(tenantId, call.providerCallId, {
      recordingUrl: call.recordingUrl,
    });
  }

  // Call connected — match the caller to an AMS contact for the screen pop.
  if (call.status === "in_progress") {
    await matchCallContact(tenantId, call.providerCallId, call.externalNumber);
  }

  // Call ended cleanly — queue the AMS activity-note write-back.
  if (call.status === "completed") {
    const amsConn = await getAmsConnection(tenantId);
    if (amsConn?.autoSyncCalls) {
      await markCallPendingAmsSync(tenantId, call.providerCallId);
    }
  }
}
