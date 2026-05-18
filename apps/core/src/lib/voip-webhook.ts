/**
 * Shared VoIP webhook handler.
 *
 * Every native carrier webhook route (RingCentral, Zoom, GoTo, Vonage) is a
 * thin wrapper over this: authenticate, normalize the provider payload, and
 * push each call through the shared `processProviderCall` pipeline.
 *
 * AUTHENTICATION (fail-closed): the tenant must have the provider connected
 * with a webhook signing secret. A request proves it knows the secret either
 * by an HMAC-SHA256 signature header (hex digest of the raw body) or by a
 * `?secret=` query parameter compared in constant time. No secret configured
 * → the webhook cannot be called.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyHmac } from "@/lib/crypto";
import { getVoipWebhookSecret } from "@/lib/voip";
import {
  processProviderCall,
  type NormalizedCall,
} from "@/lib/voip-call-events";

/* eslint-disable @typescript-eslint/no-explicit-any */

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Handle one inbound carrier webhook. `normalize` translates the provider's
 * native payload into zero or more `NormalizedCall`s.
 */
export async function handleVoipWebhook(
  req: NextRequest,
  providerId: string,
  normalize: (payload: any) => NormalizedCall[],
): Promise<Response> {
  const raw = await req.text();
  let payload: any;
  try {
    payload = raw ? JSON.parse(raw) : {};
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

  const secret = await getVoipWebhookSecret(tenantId, providerId);
  if (!secret) {
    return NextResponse.json(
      { error: `no ${providerId} connection or webhook secret for tenant` },
      { status: 401 },
    );
  }

  // Zoom URL-validation handshake — echo the hashed token back.
  if (
    payload?.event === "endpoint.url_validation" &&
    payload?.payload?.plainToken
  ) {
    const plainToken = String(payload.payload.plainToken);
    const encryptedToken = createHmac("sha256", secret)
      .update(plainToken)
      .digest("hex");
    return NextResponse.json({ plainToken, encryptedToken });
  }

  // Authenticate — a recognized signature header, or the ?secret= query param.
  const sigHeader =
    req.headers.get("x-webhook-signature") ??
    req.headers.get("x-zm-signature") ??
    req.headers.get("verification-token") ??
    req.headers.get("x-vonage-signature") ??
    "";
  const querySecret = req.nextUrl.searchParams.get("secret") ?? "";
  const authentic =
    (sigHeader.length > 0 &&
      (verifyHmac(raw, sigHeader, secret) ||
        constantTimeEqual(sigHeader, secret))) ||
    (querySecret.length > 0 && constantTimeEqual(querySecret, secret));
  if (!authentic) {
    return NextResponse.json(
      { error: "signature verification failed" },
      { status: 401 },
    );
  }

  try {
    const calls = normalize(payload);
    for (const call of calls) {
      await processProviderCall(tenantId, providerId, call);
    }
    return NextResponse.json({ received: true, calls: calls.length });
  } catch (error) {
    console.error(`[voip:${providerId}] webhook processing error:`, error);
    return NextResponse.json(
      { error: "webhook processing failed" },
      { status: 500 },
    );
  }
}

/** Subscription-verification handshake — echoes a provider's challenge. */
export function voipWebhookChallenge(req: NextRequest): Response {
  const challenge = req.nextUrl.searchParams.get("challenge");
  if (challenge) return NextResponse.json({ challenge });
  const validationToken = req.headers.get("validation-token");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Validation-Token": validationToken },
    });
  }
  return NextResponse.json({ status: "webhook endpoint active" });
}
