import { NextResponse, type NextRequest } from "next/server";
import { advanceDueSequences, allTenantIds } from "@/lib/marketing-engine";

/** Sequence advancement sends an email per due step. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Marketing-sequence worker — runs daily via Vercel Cron
 * (see `apps/core/vercel.json`).
 *
 * For every tenant, advances each enrollment whose next drip step is due:
 * sends the step's template, then schedules the next step or completes the
 * enrollment. CRON_SECRET-guarded like the other crons.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const tenantIds = await allTenantIds();
    const result = { tenants: tenantIds.length, advanced: 0, sent: 0 };
    for (const tenantId of tenantIds) {
      try {
        const { advanced, sent } = await advanceDueSequences(tenantId);
        result.advanced += advanced;
        result.sent += sent;
      } catch (error) {
        console.error(`[cron/marketing] tenant ${tenantId} failed:`, error);
      }
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/marketing] run failed:", error);
    return NextResponse.json(
      { ok: false, error: "marketing run failed" },
      { status: 500 },
    );
  }
}
