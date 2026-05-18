import { NextResponse, type NextRequest } from "next/server";
import { runDunning } from "@/lib/billing-dunning";

/** A handful of queries + emails per past-due tenant. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Billing dunning worker — runs daily via Vercel Cron
 * (see `apps/core/vercel.json`).
 *
 * Walks every past-due tenant one rung up the dunning ladder: internal alert →
 * 15-day customer warning → 30-day suspension. CRON_SECRET-guarded like the
 * other crons. Stripe webhook events drive tenants onto and off the ladder.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDunning();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/billing] run failed:", error);
    return NextResponse.json(
      { ok: false, error: "dunning run failed" },
      { status: 500 },
    );
  }
}
