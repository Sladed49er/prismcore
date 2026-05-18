/**
 * GoTo Connect webhook normalizer.
 *
 * GoTo posts notification-channel events: `call-events` (real-time call
 * state) and `call-history` (post-call records). Both are translated to
 * `NormalizedCall`. Ported from the CallIntel middleware.
 */
import { normalizePhone } from "@/lib/phone";
import type { NormalizedCall } from "@/lib/voip-call-events";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Real-time GoTo call-events: STARTING / ACTIVE / ENDING with participants. */
function fromCallEvent(content: any): NormalizedCall[] {
  const state = content?.state;
  const meta = content?.metadata;
  if (!state?.id) return [];

  const direction: NormalizedCall["direction"] =
    meta?.direction === "OUTBOUND" ? "outbound" : "inbound";
  const status: NormalizedCall["status"] =
    state.type === "STARTING"
      ? "ringing"
      : state.type === "ACTIVE"
        ? "in_progress"
        : "completed";

  const parts: any[] = Array.isArray(state.participants)
    ? state.participants
    : [];
  const phone = parts.find(
    (p) =>
      p?.type?.value === "PHONE_NUMBER" ||
      p?.type?.value === "PHONE_NUMBER_UNKNOWN",
  );
  const line = parts.find((p) => p?.type?.value === "LINE");

  const externalRaw = phone?.type?.number ?? "";
  const externalNumber = normalizePhone(externalRaw) ?? String(externalRaw);
  const agentExt = line?.type?.extensionNumber ?? "";

  return [
    {
      providerCallId: String(state.id),
      masterCallId: meta?.conversationSpaceId
        ? String(meta.conversationSpaceId)
        : null,
      direction,
      status,
      fromNumber: direction === "inbound" ? externalNumber : agentExt,
      toNumber: direction === "inbound" ? agentExt : externalNumber,
      externalNumber,
      agentName: line?.type?.name ?? null,
      agentEmail: null,
      durationSeconds: 0,
      occurredAt: state.timestamp ? new Date(state.timestamp) : new Date(),
      recordingUrl: null,
    },
  ];
}

/** Post-call GoTo call-history record. */
function fromCallHistory(content: any): NormalizedCall[] {
  const id = String(content?.legId ?? content?.originatorId ?? "");
  if (!id) return [];

  const direction: NormalizedCall["direction"] =
    content.direction === "OUTBOUND" ? "outbound" : "inbound";
  const caller = content.caller ?? {};
  const callee = content.callee ?? {};
  const fromNumber =
    normalizePhone(caller.number ?? "") ?? String(caller.number ?? "");
  const toNumber =
    normalizePhone(callee.number ?? "") ?? String(callee.number ?? "");
  const durationMs =
    typeof content.duration === "number" ? content.duration : 0;
  const answered = Boolean(content.answerTime) && durationMs > 0;

  return [
    {
      providerCallId: id,
      masterCallId: null,
      direction,
      status: answered ? "completed" : "missed",
      fromNumber,
      toNumber,
      externalNumber: direction === "inbound" ? fromNumber : toNumber,
      agentName: (direction === "inbound" ? callee.name : caller.name) ?? null,
      agentEmail: null,
      durationSeconds: Math.round(durationMs / 1000),
      occurredAt: content.startTime ? new Date(content.startTime) : new Date(),
      recordingUrl: null,
    },
  ];
}

/** Translate a GoTo notification payload into normalized calls. */
export function normalizeGoTo(payload: any): NormalizedCall[] {
  const source = String(payload?.source ?? "");
  const content = payload?.content;
  if (!content) return [];
  if (source === "call-events") return fromCallEvent(content);
  if (source === "call-history") return fromCallHistory(content);
  return [];
}
