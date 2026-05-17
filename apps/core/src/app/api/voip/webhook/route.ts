import { NextResponse } from "next/server";
import { recordCall } from "@/lib/voip";

/**
 * PrismVoice screen-pop webhook.
 *
 * VoIP providers POST inbound-call events here and the call is recorded against
 * the tenant. This is the wire-compatible cutover target: to move a customer off
 * the legacy CallIntel portal, repoint their VoIP webhook here — nothing else
 * changes, and the legacy portal keeps running until the switch is flipped.
 *
 * TODO (hardening): per-tenant API key auth before this leaves MVP.
 */
export async function POST(request: Request): Promise<Response> {
  let body: {
    tenantId?: unknown;
    fromNumber?: unknown;
    direction?: unknown;
    contactName?: unknown;
    provider?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body.tenantId !== "string" || typeof body.fromNumber !== "string") {
    return NextResponse.json(
      { error: "tenantId and fromNumber are required" },
      { status: 400 },
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
