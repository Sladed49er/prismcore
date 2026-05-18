import type { NextRequest } from "next/server";
import { handleVoipWebhook, voipWebhookChallenge } from "@/lib/voip-webhook";
import { normalizeGoTo } from "@/lib/voip-normalizers/goto";

/** Reads the raw body for signature verification — never cache. */
export const dynamic = "force-dynamic";

/**
 * GoTo Connect notification webhook.
 *   POST /api/voip/webhook/goto?tenant=<tenantId>&secret=<webhookSecret>
 */
export function POST(req: NextRequest): Promise<Response> {
  return handleVoipWebhook(req, "goto", normalizeGoTo);
}

export function GET(req: NextRequest): Response {
  return voipWebhookChallenge(req);
}
