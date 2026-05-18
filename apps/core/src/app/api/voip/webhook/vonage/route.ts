import type { NextRequest } from "next/server";
import { handleVoipWebhook, voipWebhookChallenge } from "@/lib/voip-webhook";
import { normalizeVonage } from "@/lib/voip-normalizers/vonage";

/** Reads the raw body for signature verification — never cache. */
export const dynamic = "force-dynamic";

/**
 * Vonage Voice API webhook.
 *   POST /api/voip/webhook/vonage?tenant=<tenantId>&secret=<webhookSecret>
 */
export function POST(req: NextRequest): Promise<Response> {
  return handleVoipWebhook(req, "vonage", normalizeVonage);
}

export function GET(req: NextRequest): Response {
  return voipWebhookChallenge(req);
}
