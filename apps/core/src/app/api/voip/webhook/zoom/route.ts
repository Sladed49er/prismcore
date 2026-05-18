import type { NextRequest } from "next/server";
import { handleVoipWebhook, voipWebhookChallenge } from "@/lib/voip-webhook";
import { normalizeZoom } from "@/lib/voip-normalizers/zoom";

/** Reads the raw body for signature verification — never cache. */
export const dynamic = "force-dynamic";

/**
 * Zoom Phone webhook.
 *   POST /api/voip/webhook/zoom?tenant=<tenantId>&secret=<webhookSecret>
 *
 * Handles Zoom's `endpoint.url_validation` handshake automatically.
 */
export function POST(req: NextRequest): Promise<Response> {
  return handleVoipWebhook(req, "zoom", normalizeZoom);
}

export function GET(req: NextRequest): Response {
  return voipWebhookChallenge(req);
}
