/**
 * AMS write-back — the durable call-to-AMS sync worker.
 *
 * Logging every call into the agency-management system is the whole point of
 * PrismVoice, so it cannot be best-effort. When a call ends the webhook marks
 * it `pending` on the `calls` table itself (the columns are the queue); a
 * once-a-minute Vercel cron drains the queue. An AMS outage delays the note,
 * it never drops it — the call stays `pending` and retries with backoff.
 *
 * The first attempt is deliberately delayed so Dialpad's AI recap (which
 * arrives ~2–3 min after the call) lands on the row first and rides along in
 * the note. Mirrors the legacy CallIntel `SYNC_CALL_TO_AMS` job.
 */
import { and, asc, eq, lt, lte } from "drizzle-orm";
import { adminDb, withTenantContext, calls, type Call } from "@prismcore/db";
import { getAmsAdapter, getAmsConnection } from "@/lib/ams";
import { formatPhoneForDisplay } from "@/lib/phone";

/** Wait this long after a call ends before the first AMS write — lets the
 *  Dialpad AI recap arrive so it is included in the note. */
export const AMS_SYNC_DELAY_MS = 5 * 60 * 1000;
/** Give up after this many failed attempts (then `amsSyncStatus = failed`). */
const MAX_ATTEMPTS = 5;
/** Calls processed per cron tick. */
const BATCH_SIZE = 10;

/**
 * Queue a call for AMS write-back. Called from the webhook when a call ends
 * on a tenant whose AMS has auto-sync on. `processCallSync` decides at run
 * time whether the call is actually noteable (it skips unmatched/missed).
 */
export async function markCallPendingAmsSync(
  tenantId: string,
  providerCallId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(calls)
      .set({
        amsSyncStatus: "pending",
        amsSyncAfter: new Date(Date.now() + AMS_SYNC_DELAY_MS),
        amsSyncAttempts: 0,
        amsSyncError: null,
      })
      .where(
        and(
          eq(calls.tenantId, tenantId),
          eq(calls.providerCallId, providerCallId),
        ),
      );
  });
}

export interface AmsSyncResult {
  claimed: number;
  synced: number;
  skipped: number;
  failed: number;
}

/**
 * Drain a batch of due `pending` calls into their tenants' AMS. Runs as the
 * platform worker (`adminDb`, cross-tenant) — it is the cron, not a tenant
 * session. Each call's outcome is recorded back onto its row.
 */
export async function runAmsSyncBatch(): Promise<AmsSyncResult> {
  const result: AmsSyncResult = { claimed: 0, synced: 0, skipped: 0, failed: 0 };

  const due = await adminDb()
    .select()
    .from(calls)
    .where(
      and(
        eq(calls.amsSyncStatus, "pending"),
        lte(calls.amsSyncAfter, new Date()),
        lt(calls.amsSyncAttempts, MAX_ATTEMPTS),
      ),
    )
    .orderBy(asc(calls.amsSyncAfter))
    .limit(BATCH_SIZE);

  result.claimed = due.length;

  for (const call of due) {
    try {
      const outcome = await processCallSync(call);
      if (outcome === "synced") result.synced++;
      else result.skipped++;
    } catch (error) {
      result.failed++;
      await recordSyncFailure(call, error);
    }
  }

  return result;
}

/**
 * Sync one call. Returns "synced" when a note was written, "skipped" when the
 * call is not noteable (unmatched / missed / AMS off). Throws on a real
 * failure so the caller can retry it.
 */
async function processCallSync(call: Call): Promise<"synced" | "skipped"> {
  // Unmatched, missed, or voicemail calls have no contact to note against.
  if (
    !call.matchedContactId ||
    call.status === "missed" ||
    call.status === "voicemail"
  ) {
    await adminDb()
      .update(calls)
      .set({
        amsSyncStatus: "skipped",
        amsSyncAttempts: call.amsSyncAttempts + 1,
      })
      .where(eq(calls.id, call.id));
    return "skipped";
  }

  const conn = await getAmsConnection(call.tenantId);
  if (!conn || !conn.autoSyncCalls) {
    await adminDb()
      .update(calls)
      .set({
        amsSyncStatus: "skipped",
        amsSyncAttempts: call.amsSyncAttempts + 1,
      })
      .where(eq(calls.id, call.id));
    return "skipped";
  }

  const ams = await getAmsAdapter(call.tenantId);
  if (!ams) throw new Error("AMS adapter unavailable — credentials missing");

  const { subject, body } = buildCallNote(call);
  const noteId = await ams.createActivityNote(call.matchedContactId, {
    contactId: call.matchedContactId,
    type: "call",
    subject,
    body,
    activityDate: call.occurredAt,
    agentName: call.agentName ?? undefined,
  });

  await adminDb()
    .update(calls)
    .set({
      amsSyncStatus: "synced",
      amsSyncedAt: new Date(),
      amsSyncAttempts: call.amsSyncAttempts + 1,
      amsSyncError: null,
      amsNoteId: noteId,
    })
    .where(eq(calls.id, call.id));
  return "synced";
}

/** Record a failed attempt — retry with backoff, or give up after the cap. */
async function recordSyncFailure(call: Call, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const attempts = call.amsSyncAttempts + 1;

  if (attempts >= MAX_ATTEMPTS) {
    await adminDb()
      .update(calls)
      .set({
        amsSyncStatus: "failed",
        amsSyncAttempts: attempts,
        amsSyncError: message.slice(0, 500),
      })
      .where(eq(calls.id, call.id));
    console.error(
      `[ams-sync] call ${call.id} gave up after ${attempts} attempts: ${message}`,
    );
    return;
  }

  // Exponential backoff, capped at 5 minutes.
  const backoffMs = Math.min(60_000 * 2 ** attempts, 5 * 60 * 1000);
  await adminDb()
    .update(calls)
    .set({
      amsSyncStatus: "pending",
      amsSyncAttempts: attempts,
      amsSyncError: message.slice(0, 500),
      amsSyncAfter: new Date(Date.now() + backoffMs),
    })
    .where(eq(calls.id, call.id));
  console.error(
    `[ams-sync] call ${call.id} attempt ${attempts} failed, retrying: ${message}`,
  );
}

/** Build the AMS activity-note subject + body for a completed call. */
function buildCallNote(call: Call): { subject: string; body: string } {
  const direction = call.direction === "inbound" ? "Inbound" : "Outbound";
  const contact = call.matchedContactName || call.contactName || "Unknown";
  const dateStr = call.occurredAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = call.occurredAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const mins = Math.floor(call.durationSeconds / 60);
  const secs = call.durationSeconds % 60;

  const subject = `${direction} call — ${contact} — ${dateStr}`;

  const lines: string[] = [
    `${direction} call on ${dateStr} at ${timeStr}`,
    `Number: ${formatPhoneForDisplay(call.fromNumber)}`,
    `Duration: ${mins}m ${secs}s`,
  ];
  if (call.agentName) lines.push(`Handled by: ${call.agentName}`);
  if (call.disposition) lines.push(`Disposition: ${call.disposition}`);
  if (call.aiSummary) {
    lines.push("", "--- Call Summary ---", call.aiSummary);
  }
  if (call.recordingUrl) {
    lines.push("", `Recording: ${call.recordingUrl}`);
  }
  lines.push("", "Logged by PrismVoice.");

  return { subject, body: lines.join("\n") };
}
