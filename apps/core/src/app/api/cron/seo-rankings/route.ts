import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { adminDb, tenants, tenantModules } from "@prismcore/db";
import { collectTenantRankings } from "@/lib/seo-rank-tracker";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Rank-tracking worker — runs weekly via Vercel Cron (see
 * `apps/core/vercel.json`). For every tenant with the SEO Engine enabled,
 * pull Search Console positions for its tracked keywords.
 * CRON_SECRET-guarded like the other crons.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await adminDb()
    .select({ id: tenants.id, name: tenants.name })
    .from(tenantModules)
    .innerJoin(tenants, eq(tenantModules.tenantId, tenants.id))
    .where(eq(tenantModules.moduleId, "seo_engine"));

  const summary: Record<string, { checked: number; ranking: number } | string> =
    {};
  for (const tenant of rows) {
    try {
      summary[tenant.name] = await collectTenantRankings(tenant.id);
    } catch (error) {
      summary[tenant.name] =
        error instanceof Error ? error.message : "failed";
    }
  }
  return NextResponse.json({ tenants: rows.length, summary });
}
