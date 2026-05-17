import { NextResponse } from "next/server";
import { recordCall, getTenantWebhookSecrets } from "@/lib/voip";
import { verifyHmac } from "@/lib/crypto";

/**
 * PrismVoice screen-pop webhook.
 *
 * VoIP providers POST inbound-call events here and the call is recorded
 * against the tenant. This is the wire-compatible cutover target: to move a
 * customer off the legacy CallIntel portal, repoint their VoIP webhook here.
 *
 * AUTHENTICATION (fail-closed): the request must carry an
 * `x-prismvoice-signature` header — a hex HMAC-SHA256 of the raw body keyed
 * by the tenant's webhook signing secret (set in PrismVoice → Credentials).
 * A tenant with no signing secret configured cannot receive webhook calls.
 */
export async function POST(request: Request): Promise<Response> {
  // The raw body is needed verbatim for the HMAC — read text, then parse.
  const raw = await request.text();

  let body: {
    tenantId?: unknown;
    fromNumber?: unknown;
    direction?: unknown;
    contactName?: unknown;
    provider?: unknown;
  };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.tenantId !== "string" ||
    typeof body.fromNumber !== "string"
  ) {
    return NextResponse.json(
      { error: "tenantId and fromNumber are required" },
      { status: 400 },
    );
  }

  const signature = request.headers.get("x-prismvoice-signature") ?? "";
  if (!signature) {
    return NextResponse.json(
      { error: "missing x-prismvoice-signature" },
      { status: 401 },
    );
  }

  const secrets = await getTenantWebhookSecrets(body.tenantId);
  if (secrets.length === 0) {
    return NextResponse.json(
      { error: "no webhook signing secret configured for this tenant" },
      { status: 401 },
    );
  }
  const authentic = secrets.some((secret) =>
    verifyHmac(raw, signature, secret),
  );
  if (!authentic) {
    return NextResponse.json(
      { error: "signature verification failed" },
      { status: 401 },
    );
  }

  await recordCall({
    tenantId: body.tenantId,
    fromNumber: body.fromNumber,
    direction: body.direction === "outbound" ? "outbound" : "inbound",
    contactName:
      typeof body.contactName === "string" ? body.contactName : null,
    provider: typeof body.provider === "string" ? body.provider : "webhook",
  });

  return NextResponse.json({ ok: true });
}
