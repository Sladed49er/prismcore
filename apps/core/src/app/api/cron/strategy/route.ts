import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { adminDb, tenants, tenantMetrics } from "@prismcore/db";
import { snapshotAllMetrics, evaluateTenantRules } from "@/lib/strategy/engine";
import { sendAlertEmails } from "@/lib/strategy/notify";

/** Metric snapshots + rule evaluation can run a few queries per tenant. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Strategy-monitoring worker — runs hourly via Vercel Cron
 * (see `apps/core/vercel.json`).
 *
 * For every tenant that has metrics: snapshot each metric (so trend history
 * builds), then evaluate every rule. Newly-fired alerts are written (in-app)
 * and emailed to the tenant's team. CRON_SECRET-guarded like the other crons.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Distinct tenants that actually have metrics to monitor.
    const rows = await adminDb()
      .selectDistinct({ id: tenants.id, name: tenants.name })
      .from(tenantMetrics)
      .innerJoin(tenants, eq(tenantMetrics.tenantId, tenants.id));

    const result = { tenants: rows.length, raised: 0, emailed: 0 };

    for (const tenant of rows) {
      try {
        await snapshotAllMetrics(tenant.id);
        const { raised } = await evaluateTenantRules(tenant.id);
        if (raised.length > 0) {
          result.raised += raised.length;
          const email = await sendAlertEmails(tenant.id, tenant.name, raised);
          if (email.sent) result.emailed += raised.length;
        }
      } catch (error) {
        console.error(`[cron/strategy] tenant ${tenant.id} failed:`, error);
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/strategy] run failed:", error);
    return NextResponse.json(
      { ok: false, error: "strategy run failed" },
      { status: 500 },
    );
  }
}
