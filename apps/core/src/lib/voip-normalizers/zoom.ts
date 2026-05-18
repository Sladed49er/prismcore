/**
 * Zoom Phone webhook normalizer.
 *
 * Zoom posts `phone.*` call-lifecycle events. Translated to `NormalizedCall`.
 * Ported from the CallIntel middleware.
 */
import { normalizePhone } from "@/lib/phone";
import type { NormalizedCall } from "@/lib/voip-call-events";

/* eslint-disable @typescript-eslint/no-explicit-any */

function zoomStatus(event: string, result?: string): NormalizedCall["status"] {
  if (event === "phone.callee_missed") return "missed";
  if (event === "phone.voicemail_received") return "voicemail";
  if (event.endsWith("_ringing")) return "ringing";
  if (event.endsWith("_connected") || event.endsWith("_answered")) {
    return "in_progress";
  }
  switch (result) {
    case "Call connected":
    case "Recorded":
    case "Auto Recorded":
      return "completed";
    case "Voicemail":
      return "voicemail";
    case "Missed":
    case "No Answer":
    case "Rejected":
    case "Blocked":
    case "Busy":
    case "Call Cancel":
    case "Call Cancelled":
    case "Call failed":
    case "Internal Error":
      return "missed";
    default:
      return event.includes("ended") ? "completed" : "missed";
  }
}

/** Translate a Zoom Phone webhook event into a normalized call. */
export function normalizeZoom(payload: any): NormalizedCall[] {
  const event = String(payload?.event ?? "");
  const obj = payload?.payload?.object;
  if (!obj || !event.startsWith("phone.")) return [];

  const direction: NormalizedCall["direction"] =
    obj.direction === "outbound" ? "outbound" : "inbound";
  const callerNum = obj.caller_number ?? obj.caller_did_number ?? "";
  const calleeNum = obj.callee_number ?? obj.callee_did_number ?? "";
  const fromNumber = normalizePhone(callerNum) ?? String(callerNum);
  const toNumber = normalizePhone(calleeNum) ?? String(calleeNum);

  return [
    {
      providerCallId: String(obj.call_id ?? `zoom-${payload.event_ts ?? ""}`),
      masterCallId: null,
      direction,
      status: zoomStatus(event, obj.result),
      fromNumber,
      toNumber,
      externalNumber: direction === "inbound" ? fromNumber : toNumber,
      agentName:
        (direction === "inbound" ? obj.callee_name : obj.caller_name) ?? null,
      agentEmail: null,
      durationSeconds: typeof obj.duration === "number" ? obj.duration : 0,
      occurredAt: obj.date_time
        ? new Date(obj.date_time)
        : new Date(payload.event_ts ?? Date.now()),
      recordingUrl: null,
    },
  ];
}
