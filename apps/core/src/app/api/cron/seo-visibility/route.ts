import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { adminDb, tenants, tenantModules } from "@prismcore/db";
import { runTenantVisibilityChecks } from "@/lib/seo-visibility";

/** Each query is a web-searched model call — give the sweep headroom. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TIME_BUDGET_MS = 240_000;

/**
 * AI-visibility worker — runs weekly via Vercel Cron (see
 * `apps/core/vercel.json`). For every tenant with the SEO Engine enabled,
 * ask the answer engine each tracked query and record whether the tenant
 * was part of the answer. CRON_SECRET-guarded like the other crons.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const rows = await adminDb()
    .select({ id: tenants.id, name: tenants.name })
    .from(tenantModules)
    .innerJoin(tenants, eq(tenantModules.tenantId, tenants.id))
    .where(eq(tenantModules.moduleId, "seo_engine"));

  const summary: Record<string, { checked: number; mentions: number }> = {};
  for (const tenant of rows) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    try {
      const run = await runTenantVisibilityChecks({
        tenantId: tenant.id,
        tenantName: tenant.name,
      });
      summary[tenant.name] = { checked: run.checked, mentions: run.mentions };
    } catch {
      summary[tenant.name] = { checked: 0, mentions: 0 };
    }
  }
  return NextResponse.json({ tenants: rows.length, summary });
}
