import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { verifyHmac } from "@/lib/crypto";
import { normalizePhone } from "@/lib/phone";
import {
  getDialpadWebhookContext,
  getProviderCall,
  upsertProviderCall,
  patchProviderCall,
  triggerDialpadScreenPop,
} from "@/lib/voip";
import {
  getAmsAdapter,
  getAmsConnection,
  buildAms360CustomerUrl,
} from "@/lib/ams";
import {
  type DialpadCallEvent,
  mapDialpadCallStatus,
  mapDialpadDirection,
  getExternalNumber,
  getInternalNumber,
} from "@/lib/dialpad";

/**
 * Dialpad call-events webhook — the native CallIntel replacement.
 *
 * Point a Dialpad call-events subscription at:
 *   POST /api/voip/webhook/dialpad?tenant=<tenantId>
 *
 * AUTHENTICATION (fail-closed): the tenant must have a Dialpad connection
 * with a webhook signing secret. The request proves it knows that secret by
 * either an HMAC-SHA256 header (`x-dialpad-signature` / `x-webhook-signature`,
 * hex digest of the raw body) or a `?secret=` query parameter matched in
 * constant time. No secret configured → the webhook cannot be called.
 *
 * On each event Prism Core records the call (keyed by Dialpad's `call_id`,
 * so retries update one row), and on `connected` looks the caller up in the
 * tenant's AMS and fires the Dialpad screen pop to the answering agent.
 */
export async function POST(req: NextRequest): Promise<Response> {
  // Raw body is needed verbatim for the HMAC — read text, then parse.
  const raw = await req.text();

  let event: DialpadCallEvent;
  try {
    event = JSON.parse(raw) as DialpadCallEvent;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const tenantId =
    req.nextUrl.searchParams.get("tenant") ??
    req.nextUrl.searchParams.get("org");
  if (!tenantId) {
    return NextResponse.json(
      { error: "missing ?tenant= query parameter" },
      { status: 400 },
    );
  }

  const ctx = await getDialpadWebhookContext(tenantId);
  if (!ctx) {
    return NextResponse.json(
      { error: "no Dialpad connection for this tenant" },
      { status: 404 },
    );
  }

  // ── Authenticate (fail-closed) ──────────────────────────────────────────
  if (!ctx.webhookSecret) {
    return NextResponse.json(
      { error: "no webhook signing secret configured" },
      { status: 401 },
    );
  }
  const headerSig =
    req.headers.get("x-dialpad-signature") ??
    req.headers.get("x-webhook-signature") ??
    "";
  const querySecret = req.nextUrl.searchParams.get("secret") ?? "";
  const authentic = headerSig
    ? verifyHmac(raw, headerSig, ctx.webhookSecret)
    : querySecret
      ? constantTimeEqual(querySecret, ctx.webhookSecret)
      : false;
  if (!authentic) {
    return NextResponse.json(
      { error: "signature verification failed" },
      { status: 401 },
    );
  }

  // ── Route by call state ─────────────────────────────────────────────────
  try {
    switch (event.state) {
      case "calling":
      case "ringing":
        await handleCallStarted(tenantId, event);
        break;
      case "connected":
        await handleCallConnected(tenantId, event, ctx.apiToken);
        break;
      case "hangup":
        await handleCallEnded(tenantId, event);
        break;
      case "missed":
      case "voicemail":
      case "voicemail_uploaded":
        await handleCallMissed(tenantId, event);
        break;
      case "recording":
        await handleRecording(tenantId, event);
        break;
      case "call_transcription":
        await handleTranscription(tenantId, event);
        break;
      case "recap_summary":
      case "recap_outcome":
      case "recap_purposes":
      case "recap_action_items":
        await handleRecap(tenantId, event);
        break;
      default:
        // Unhandled state — acknowledge so Dialpad does not retry.
        break;
    }
  } catch (error) {
    console.error("[Dialpad webhook] processing error:", error);
    return NextResponse.json(
      { error: "webhook processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

/** Dialpad webhook subscription verification handshake. */
export async function GET(req: NextRequest): Promise<Response> {
  const challenge = req.nextUrl.searchParams.get("challenge");
  if (challenge) return NextResponse.json({ challenge });
  return NextResponse.json({ status: "Dialpad webhook endpoint active" });
}

// ── Handlers ──────────────────────────────────────────────────────────────

/**
 * Dialpad fires a separate event for the master call and for each leg. A
 * child leg's `call_id` differs from its `master_call_id`; skip it once the
 * master call has its own row, so one physical call is not logged twice.
 */
async function isRedundantChildLeg(
  tenantId: string,
  event: DialpadCallEvent,
): Promise<boolean> {
  if (!event.master_call_id || event.call_id === event.master_call_id) {
    return false;
  }
  const master = await getProviderCall(tenantId, String(event.master_call_id));
  return master !== null;
}

function dialedNumbers(event: DialpadCallEvent): {
  fromNumber: string;
  toNumber: string;
} {
  const external = getExternalNumber(event);
  const internal = getInternalNumber(event);
  return event.direction === "inbound"
    ? {
        fromNumber: normalizePhone(external) ?? external,
        toNumber: normalizePhone(internal) ?? internal,
      }
    : {
        fromNumber: normalizePhone(internal) ?? internal,
        toNumber: normalizePhone(external) ?? external,
      };
}

async function handleCallStarted(
  tenantId: string,
  event: DialpadCallEvent,
): Promise<void> {
  if (await isRedundantChildLeg(tenantId, event)) return;
  const { fromNumber, toNumber } = dialedNumbers(event);
  await upsertProviderCall({
    tenantId,
    providerCallId: String(event.call_id),
    masterCallId: event.master_call_id ? String(event.master_call_id) : null,
    direction: mapDialpadDirection(event.direction),
    status: mapDialpadCallStatus(event.state),
    fromNumber,
    toNumber,
    agentName: event.target?.name ?? null,
    agentEmail: event.target?.email ?? null,
    provider: "dialpad",
    occurredAt: event.date_started ? new Date(event.date_started) : new Date(),
  });
}

async function handleCallConnected(
  tenantId: string,
  event: DialpadCallEvent,
  apiToken: string,
): Promise<void> {
  const callId = String(event.call_id);
  const { fromNumber, toNumber } = dialedNumbers(event);

  // Make sure the call exists (a missed `ringing` event is not guaranteed),
  // then mark it answered + record the handling agent.
  await upsertProviderCall({
    tenantId,
    providerCallId: callId,
    masterCallId: event.master_call_id ? String(event.master_call_id) : null,
    direction: mapDialpadDirection(event.direction),
    status: "in_progress",
    fromNumber,
    toNumber,
    agentName: event.target?.name ?? null,
    agentEmail: event.target?.email ?? null,
    provider: "dialpad",
    occurredAt: event.date_started ? new Date(event.date_started) : new Date(),
  });

  // ── AMS contact lookup + screen pop ───────────────────────────────────
  const amsConn = await getAmsConnection(tenantId);
  if (!amsConn) return;

  const customerNumber = normalizePhone(getExternalNumber(event));
  if (!customerNumber) return;

  let contact: { sourceId: string; name: string } | null = null;
  try {
    const ams = await getAmsAdapter(tenantId);
    if (ams) {
      // Cap the lookup so a slow AMS never stalls the webhook.
      const matches = await Promise.race([
        ams.lookupByPhone(customerNumber),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AMS lookup timeout")), 5000),
        ),
      ]);
      const first = matches[0];
      if (first) {
        contact = {
          sourceId: first.sourceId,
          name: first.fullName || first.companyName || customerNumber,
        };
      }
    }
  } catch (error) {
    console.error("[Dialpad webhook] AMS lookup failed:", error);
  }

  if (!contact) return;

  await patchProviderCall(tenantId, callId, {
    contactName: contact.name,
    matchedContactId: contact.sourceId,
    matchedContactName: contact.name,
  });

  // Fire the Dialpad native screen pop to the answering agent.
  if (!amsConn.screenPopEnabled) return;
  const dialpadUserId = event.target?.id ? String(event.target.id) : null;
  const amsUrl = buildAms360CustomerUrl(amsConn, contact.sourceId);
  if (dialpadUserId && amsUrl && apiToken) {
    await triggerDialpadScreenPop(apiToken, dialpadUserId, amsUrl);
  }
}

async function handleCallEnded(
  tenantId: string,
  event: DialpadCallEvent,
): Promise<void> {
  const callId = String(event.call_id);
  const durationSeconds = event.duration
    ? Math.round(event.duration / 1000)
    : 0;

  const existing = await getProviderCall(tenantId, callId);
  if (!existing) {
    // The start event was missed — create the row directly.
    if (await isRedundantChildLeg(tenantId, event)) return;
    const { fromNumber, toNumber } = dialedNumbers(event);
    await upsertProviderCall({
      tenantId,
      providerCallId: callId,
      masterCallId: event.master_call_id ? String(event.master_call_id) : null,
      direction: mapDialpadDirection(event.direction),
      status: durationSeconds > 0 ? "completed" : "missed",
      fromNumber,
      toNumber,
      agentName: event.target?.name ?? null,
      agentEmail: event.target?.email ?? null,
      durationSeconds,
      provider: "dialpad",
      occurredAt: event.date_started
        ? new Date(event.date_started)
        : new Date(),
    });
  } else {
    await patchProviderCall(tenantId, callId, {
      status: durationSeconds > 0 ? "completed" : "missed",
      durationSeconds,
      endedAt: event.date_ended ? new Date(event.date_ended) : new Date(),
    });
  }

  // Recording, when Dialpad attaches it to the hangup event.
  const recordingUrl = event.recording_details?.[0]?.url;
  if (recordingUrl) {
    await patchProviderCall(tenantId, callId, { recordingUrl });
  }

  // Log the call into the tenant's AMS, when auto-sync is on.
  await syncCallToAms(tenantId, callId);
}

async function handleCallMissed(
  tenantId: string,
  event: DialpadCallEvent,
): Promise<void> {
  if (await isRedundantChildLeg(tenantId, event)) return;
  const { fromNumber, toNumber } = dialedNumbers(event);
  await upsertProviderCall({
    tenantId,
    providerCallId: String(event.call_id),
    masterCallId: event.master_call_id ? String(event.master_call_id) : null,
    direction: mapDialpadDirection(event.direction),
    status: mapDialpadCallStatus(event.state),
    fromNumber,
    toNumber,
    agentName: event.target?.name ?? null,
    agentEmail: event.target?.email ?? null,
    provider: "dialpad",
    occurredAt: event.date_started ? new Date(event.date_started) : new Date(),
  });
}

async function handleRecording(
  tenantId: string,
  event: DialpadCallEvent,
): Promise<void> {
  const recordingUrl = event.recording_details?.[0]?.url;
  if (!recordingUrl) return;
  await patchProviderCall(tenantId, String(event.call_id), { recordingUrl });
}

async function handleTranscription(
  tenantId: string,
  event: DialpadCallEvent,
): Promise<void> {
  const text =
    event.transcription_text ||
    event.public_call_review_share_link ||
    event.company_call_review_share_link;
  if (!text) return;
  await patchProviderCall(tenantId, String(event.call_id), {
    transcript: text,
  });
}

/** Dialpad AI recap arrives ~2–3 min after a call as separate webhook events. */
async function handleRecap(
  tenantId: string,
  event: DialpadCallEvent,
): Promise<void> {
  const recap = event as unknown as {
    recap_summary?: string;
    summary?: string;
  };
  const summary = recap.recap_summary || recap.summary;
  if (!summary) return;
  await patchProviderCall(tenantId, String(event.call_id), {
    aiSummary: summary,
  });
}

/** Write a call activity note onto the matched AMS contact, best-effort. */
async function syncCallToAms(
  tenantId: string,
  providerCallId: string,
): Promise<void> {
  try {
    const conn = await getAmsConnection(tenantId);
    if (!conn || !conn.autoSyncCalls) return;
    const call = await getProviderCall(tenantId, providerCallId);
    if (!call || !call.matchedContactId) return;

    const ams = await getAmsAdapter(tenantId);
    if (!ams) return;

    const mins = Math.round(call.durationSeconds / 60);
    const verb = call.direction === "inbound" ? "Inbound" : "Outbound";
    const body = [
      `${verb} call — ${call.fromNumber}`,
      call.agentName ? `Handled by: ${call.agentName}` : null,
      `Duration: ${mins} min`,
      call.disposition ? `Disposition: ${call.disposition}` : null,
      call.aiSummary ? `\nSummary: ${call.aiSummary}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await ams.createActivityNote(call.matchedContactId, {
      contactId: call.matchedContactId,
      type: "call",
      subject: `${verb} call logged by PrismVoice`,
      body,
      activityDate: call.occurredAt,
      agentName: call.agentName ?? undefined,
    });
  } catch (error) {
    console.error("[Dialpad webhook] AMS call-note sync failed:", error);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
