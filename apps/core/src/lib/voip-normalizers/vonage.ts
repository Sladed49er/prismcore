/**
 * Vonage Voice API webhook normalizer.
 *
 * Vonage posts call-lifecycle events (started, ringing, answered, completed,
 * failed, …) to the app's Event URL. SMS events are ignored here. Ported from
 * the CallIntel middleware.
 */
import { normalizePhone } from "@/lib/phone";
import type { NormalizedCall } from "@/lib/voip-call-events";

/* eslint-disable @typescript-eslint/no-explicit-any */

function vonageStatus(status: string): NormalizedCall["status"] {
  switch (status) {
    case "started":
    case "ringing":
      return "ringing";
    case "answered":
      return "in_progress";
    case "completed":
      return "completed";
    case "failed":
    case "busy":
    case "timeout":
    case "rejected":
    case "cancelled":
    case "unanswered":
      return "missed";
    default:
      return "ringing";
  }
}

/** Translate a Vonage webhook event into a normalized call. */
export function normalizeVonage(payload: any): NormalizedCall[] {
  const e = payload ?? {};
  // SMS / message events carry `text` — not a call.
  if (e.type === "text" || e.message_uuid) return [];

  const id = String(e.uuid ?? e.call_uuid ?? "");
  if (!id || !e.status) return [];

  const direction: NormalizedCall["direction"] =
    e.direction === "outbound" ? "outbound" : "inbound";
  const fromNumber = normalizePhone(e.from ?? "") ?? String(e.from ?? "");
  const toNumber = normalizePhone(e.to ?? "") ?? String(e.to ?? "");
  const durationRaw =
    typeof e.duration === "string"
      ? Number.parseInt(e.duration, 10)
      : (e.duration ?? 0);

  return [
    {
      providerCallId: id,
      masterCallId:
        e.conversation_uuid && String(e.conversation_uuid) !== id
          ? String(e.conversation_uuid)
          : null,
      direction,
      status: vonageStatus(String(e.status)),
      fromNumber,
      toNumber,
      externalNumber: direction === "inbound" ? fromNumber : toNumber,
      agentName: null,
      agentEmail: null,
      durationSeconds: durationRaw > 0 ? durationRaw : 0,
      occurredAt: e.start_time
        ? new Date(e.start_time)
        : e.timestamp
          ? new Date(e.timestamp)
          : new Date(),
      recordingUrl: e.recording_url ?? null,
    },
  ];
}
