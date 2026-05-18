import type { NextRequest } from "next/server";
import { handleVoipWebhook, voipWebhookChallenge } from "@/lib/voip-webhook";
import { normalizeRingCentral } from "@/lib/voip-normalizers/ringcentral";

/** Reads the raw body for signature verification — never cache. */
export const dynamic = "force-dynamic";

/**
 * RingCentral telephony webhook.
 *   POST /api/voip/webhook/ringcentral?tenant=<tenantId>&secret=<webhookSecret>
 */
export function POST(req: NextRequest): Promise<Response> {
  return handleVoipWebhook(req, "ringcentral", normalizeRingCentral);
}

export function GET(req: NextRequest): Response {
  return voipWebhookChallenge(req);
}
