import { desc, eq, and } from "drizzle-orm";
import { adminDb, seoSiteAudits } from "@prismcore/db";
import type { SiteAuditReport } from "@/lib/seo-site-audit";

/**
 * Saved deep-audit reports. Every crawl is stored; a repeat request for the
 * same site inside the freshness window serves the saved report instead of
 * re-crawling and re-paying the AI pass. Owner keys: a Clerk user id
 * (PrismOptimize members) or `tenant:<uuid>` (SEO Engine module).
 */

export const FRESH_MS = 24 * 60 * 60 * 1000;

export interface SavedAuditSummary {
  id: string;
  siteUrl: string;
  score: number;
  createdAt: string;
}

export async function saveSiteAudit(
  ownerKey: string,
  report: SiteAuditReport,
): Promise<void> {
  await adminDb().insert(seoSiteAudits).values({
    ownerKey,
    siteUrl: report.root,
    score: report.score,
    report,
  });
}

/** The newest saved report for this owner+site, if it's still fresh. */
export async function freshSiteAudit(
  ownerKey: string,
  siteUrl: string,
): Promise<SiteAuditReport | undefined> {
  const rows = await adminDb()
    .select()
    .from(seoSiteAudits)
    .where(
      and(
        eq(seoSiteAudits.ownerKey, ownerKey),
        eq(seoSiteAudits.siteUrl, siteUrl),
      ),
    )
    .orderBy(desc(seoSiteAudits.createdAt))
    .limit(1);
  const row = rows[0];
  if (!row || Date.now() - row.createdAt.getTime() > FRESH_MS) return undefined;
  return {
    ...(row.report as SiteAuditReport),
    fromCache: true,
    generatedAt: row.createdAt.toISOString(),
  };
}

/** Owner-scoped delete. Reports are never removed any other way — every
 *  crawl is kept permanently until its owner explicitly deletes it. */
export async function deleteSiteAudit(
  ownerKey: string,
  id: string,
): Promise<boolean> {
  const res = await adminDb()
    .delete(seoSiteAudits)
    .where(
      and(eq(seoSiteAudits.id, id), eq(seoSiteAudits.ownerKey, ownerKey)),
    )
    .returning({ id: seoSiteAudits.id });
  return res.length > 0;
}

export async function listSiteAudits(
  ownerKey: string,
  limit = 500,
): Promise<SavedAuditSummary[]> {
  const rows = await adminDb()
    .select({
      id: seoSiteAudits.id,
      siteUrl: seoSiteAudits.siteUrl,
      score: seoSiteAudits.score,
      createdAt: seoSiteAudits.createdAt,
    })
    .from(seoSiteAudits)
    .where(eq(seoSiteAudits.ownerKey, ownerKey))
    .orderBy(desc(seoSiteAudits.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    siteUrl: r.siteUrl,
    score: r.score,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getSiteAudit(
  ownerKey: string,
  id: string,
): Promise<SiteAuditReport | undefined> {
  const rows = await adminDb()
    .select()
    .from(seoSiteAudits)
    .where(
      and(eq(seoSiteAudits.id, id), eq(seoSiteAudits.ownerKey, ownerKey)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  return {
    ...(row.report as SiteAuditReport),
    fromCache: true,
    generatedAt: row.createdAt.toISOString(),
  };
}
