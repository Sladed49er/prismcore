import { NextResponse, type NextRequest } from "next/server";
import { evaluateRules, allTenantIds } from "@/lib/automation-engine";

/** Rule evaluation runs a handful of queries per tenant. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Automation worker — runs daily via Vercel Cron
 * (see `apps/core/vercel.json`).
 *
 * For every tenant, evaluates each enabled automation rule and fires its
 * action on newly-matching records. CRON_SECRET-guarded like the other crons.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const tenantIds = await allTenantIds();
    const result = { tenants: tenantIds.length, rulesRun: 0, fired: 0 };
    for (const tenantId of tenantIds) {
      try {
        const { rulesRun, fired } = await evaluateRules(tenantId);
        result.rulesRun += rulesRun;
        result.fired += fired;
      } catch (error) {
        console.error(`[cron/automations] tenant ${tenantId} failed:`, error);
      }
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/automations] run failed:", error);
    return NextResponse.json(
      { ok: false, error: "automation run failed" },
      { status: 500 },
    );
  }
}
