"use server";

import { runSeoAudit, type AuditReport } from "@/lib/seo-audit";
import {
  runDeepSiteAudit,
  type SiteAuditReport,
} from "@/lib/seo-site-audit";
import { validateAuditUrl } from "@/lib/seo-audit";
import { getPrismOptimizeMembership } from "@/lib/prismoptimize-membership";
import { addMonitor, removeMonitor } from "@/lib/seo-monitoring";
import {
  freshSiteAudit,
  saveSiteAudit,
  getSiteAudit,
} from "@/lib/seo-audit-store";
import { revalidatePath } from "next/cache";

/**
 * PrismOptimize audit — members only. Membership is checked server-side on
 * every call (the page also gates the UI, but the action is the real door).
 * Until paid memberships launch, members are the gift list in
 * `PRISMOPTIMIZE_MEMBER_EMAILS`.
 */

export async function publicAudit(url: string): Promise<AuditReport> {
  const membership = await getPrismOptimizeMembership();
  if (!membership.entitled) {
    return {
      url,
      fetched: false,
      error: membership.signedIn
        ? "PrismOptimize memberships are opening soon — your account isn't active yet."
        : "PrismOptimize is members-only — sign in to run audits.",
      checks: [],
      suggestions: [],
    };
  }

  try {
    return await runSeoAudit(url);
  } catch (error) {
    return {
      url,
      fetched: false,
      error: error instanceof Error ? error.message : "Audit failed.",
      checks: [],
      suggestions: [],
    };
  }
}

export async function deepAudit(
  url: string,
  force = false,
): Promise<SiteAuditReport> {
  const membership = await getPrismOptimizeMembership();
  if (!membership.entitled) {
    return failedSiteAudit(
      url,
      membership.signedIn
        ? "PrismOptimize memberships are opening soon — your account isn't active yet."
        : "PrismOptimize is members-only — sign in to run audits.",
    );
  }
  try {
    const origin = validateAuditUrl(url).origin;
    if (!force) {
      const saved = await freshSiteAudit(membership.userId, origin);
      if (saved) return saved;
    }
    const report = await runDeepSiteAudit(origin);
    if (!report.error) {
      await saveSiteAudit(membership.userId, report);
      revalidatePath("/prismseo");
    }
    return report;
  } catch (error) {
    return failedSiteAudit(
      url,
      error instanceof Error ? error.message : "The site analysis failed.",
    );
  }
}

export async function loadSavedAudit(
  id: string,
): Promise<SiteAuditReport> {
  const membership = await getPrismOptimizeMembership();
  if (!membership.entitled) {
    return failedSiteAudit("", "Members only.");
  }
  const saved = await getSiteAudit(membership.userId, id);
  return saved ?? failedSiteAudit("", "That report is no longer available.");
}

export async function addSiteMonitor(url: string): Promise<string> {
  const membership = await getPrismOptimizeMembership();
  if (!membership.entitled) return "Members only.";
  try {
    await addMonitor({
      clerkUserId: membership.userId,
      email: membership.email,
      siteUrl: url,
    });
    revalidatePath("/prismseo");
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Could not add the site.";
  }
}

export async function removeSiteMonitor(id: string): Promise<void> {
  const membership = await getPrismOptimizeMembership();
  if (!membership.entitled) return;
  await removeMonitor(membership.userId, id);
  revalidatePath("/prismseo");
}

function failedSiteAudit(url: string, error: string): SiteAuditReport {
  return {
    root: url,
    error,
    durationMs: 0,
    pagesDiscovered: 0,
    pagesCrawled: 0,
    truncated: false,
    score: 0,
    categoryScores: [],
    summary: "",
    actions: [],
    stats: {
      missingTitle: 0, missingMeta: 0, missingH1: 0, thinPages: 0,
      imagesTotal: 0, imagesMissingAlt: 0, noindexPages: 0,
      missingCanonical: 0, missingOg: 0, missingStructuredData: 0,
      missingLang: 0, fetchErrors: 0,
    },
    technical: {
      sitemapFound: false, robotsFound: false,
      httpRedirectsToHttps: null, wwwVariantRedirects: null,
    },
    duplicateTitles: [],
    duplicateMetas: [],
    brokenLinks: [],
    pages: [],
  };
}
