/**
 * RingCentral webhook normalizer.
 *
 * RingCentral posts telephony-session events (real-time call state) and
 * call-log records (post-call). Both are translated to `NormalizedCall`.
 * Ported from the CallIntel middleware.
 */
import { normalizePhone } from "@/lib/phone";
import type { NormalizedCall } from "@/lib/voip-call-events";

/* eslint-disable @typescript-eslint/no-explicit-any */

function rcStatus(
  result?: string,
  telephonyStatus?: string,
): NormalizedCall["status"] {
  if (telephonyStatus === "Ringing") return "ringing";
  if (telephonyStatus === "CallConnected") return "in_progress";
  switch (result) {
    case "Accepted":
    case "Call connected":
    case "Call Connected":
      return "completed";
    case "Voicemail":
      return "voicemail";
    case "Missed":
    case "No Answer":
    case "Rejected":
    case "Busy":
    case "Blocked":
    case "Call Failed":
    case "Internal Error":
      return "missed";
    default:
      return telephonyStatus === "NoCall" ? "completed" : "ringing";
  }
}

/** Translate a RingCentral webhook payload into normalized calls. */
export function normalizeRingCentral(payload: any): NormalizedCall[] {
  const body = payload?.body ?? payload ?? {};
  const records: any[] = Array.isArray(body.activeCalls)
    ? body.activeCalls
    : Array.isArray(body.records)
      ? body.records
      : body.sessionId || body.id || body.telephonySessionId
        ? [body]
        : [];

  const out: NormalizedCall[] = [];
  for (const c of records) {
    const id = String(c.id ?? c.sessionId ?? c.telephonySessionId ?? "");
    if (!id) continue;
    const direction: NormalizedCall["direction"] =
      c.direction === "Outbound" ? "outbound" : "inbound";
    const from = c.from ?? {};
    const to = c.to ?? {};
    const fromNumber =
      normalizePhone(from.phoneNumber ?? "") ?? from.phoneNumber ?? "";
    const toNumber =
      normalizePhone(to.phoneNumber ?? "") ?? to.phoneNumber ?? "";
    out.push({
      providerCallId: id,
      masterCallId:
        c.sessionId && String(c.sessionId) !== id ? String(c.sessionId) : null,
      direction,
      status: rcStatus(c.result, c.telephonyStatus),
      fromNumber,
      toNumber,
      externalNumber: direction === "inbound" ? fromNumber : toNumber,
      agentName: (direction === "inbound" ? to.name : from.name) ?? null,
      agentEmail: null,
      durationSeconds: typeof c.duration === "number" ? c.duration : 0,
      occurredAt: c.startTime ? new Date(c.startTime) : new Date(),
      recordingUrl: c.recording?.contentUri ?? c.recording?.uri ?? null,
    });
  }
  return out;
}
