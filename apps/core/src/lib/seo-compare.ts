import Anthropic from "@anthropic-ai/sdk";
import { validateAuditUrl } from "@/lib/seo-audit";
import {
  runDeepSiteAudit,
  type SiteAuditReport,
} from "@/lib/seo-site-audit";
import { freshSiteAudit, saveSiteAudit } from "@/lib/seo-audit-store";

/**
 * Multi-site comparison: audit several domains in parallel and compile one
 * side-by-side report. Each site reuses the owner's saved report when it's
 * still fresh (<24h) — no re-crawl, no extra AI spend — and fresh crawls
 * land in the owner's permanent history like any other run. One additional
 * Claude call writes the comparative summary across all sites.
 */

const MODEL = "claude-sonnet-4-6";
export const MAX_COMPARE_SITES = 10;

export interface CompareSite {
  url: string;
  host: string;
  error?: string;
  fromCache: boolean;
  generatedAt?: string;
  score: number;
  categoryScores: { label: string; score: number }[];
  pagesCrawled: number;
  thinPages: number;
  missingMeta: number;
  missingTitle: number;
  missingH1: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  brokenLinks: number;
  duplicateTitles: number;
  fetchErrors: number;
}

export interface CompareResult {
  ok: boolean;
  error?: string;
  sites: CompareSite[];
  /** Comparative executive summary — how the first site stacks up. */
  summary: string;
  generatedAt: string;
}

function toCompareSite(report: SiteAuditReport): CompareSite {
  return {
    url: report.root,
    host: new URL(report.root).hostname.replace(/^www\./, ""),
    error: report.error,
    fromCache: report.fromCache ?? false,
    generatedAt: report.generatedAt,
    score: report.score,
    categoryScores: report.categoryScores,
    pagesCrawled: report.pagesCrawled,
    thinPages: report.stats.thinPages,
    missingMeta: report.stats.missingMeta,
    missingTitle: report.stats.missingTitle,
    missingH1: report.stats.missingH1,
    imagesTotal: report.stats.imagesTotal,
    imagesMissingAlt: report.stats.imagesMissingAlt,
    brokenLinks: report.brokenLinks.length,
    duplicateTitles: report.duplicateTitles.length,
    fetchErrors: report.stats.fetchErrors,
  };
}

async function comparativeSummary(sites: CompareSite[]): Promise<string> {
  const anthropic = new Anthropic();
  const table = sites
    .map(
      (s) =>
        `${s.host}: score ${s.score} (content ${s.categoryScores.find((c) => c.label === "Content")?.score}, technical ${s.categoryScores.find((c) => c.label === "Technical")?.score}, social ${s.categoryScores.find((c) => c.label === "Social")?.score}, accessibility ${s.categoryScores.find((c) => c.label === "Accessibility")?.score}); ${s.pagesCrawled} pages; thin ${s.thinPages}; missing metas ${s.missingMeta}; missing titles ${s.missingTitle}; missing H1s ${s.missingH1}; images w/o alt ${s.imagesMissingAlt}/${s.imagesTotal}; broken links ${s.brokenLinks}; duplicate titles ${s.duplicateTitles}`,
    )
    .join("\n");
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are writing the executive summary of an SEO comparison report. The FIRST site listed is the reader's own site; the rest are sites they're comparing against.

${table}

Write 2-3 short paragraphs: (1) how the first site ranks against the others and the single biggest gap or lead, (2) what the strongest competitor does best and where each other site is weakest, (3) the highest-impact next step for the first site. Plain prose, no headings or bullets, grounded ONLY in the numbers above — do not invent facts about the businesses.`,
      },
    ],
  });
  return response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

export async function runComparison(
  rawUrls: string[],
  ownerKey: string,
): Promise<CompareResult> {
  const generatedAt = new Date().toISOString();
  const fail = (error: string): CompareResult => ({
    ok: false,
    error,
    sites: [],
    summary: "",
    generatedAt,
  });

  const origins: string[] = [];
  for (const raw of rawUrls.map((u) => u.trim()).filter(Boolean)) {
    let origin: string;
    try {
      origin = validateAuditUrl(raw).origin;
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : `"${raw}" isn't a valid URL.`,
      );
    }
    if (!origins.includes(origin)) origins.push(origin);
  }
  if (origins.length < 2) return fail("Enter at least two different sites to compare.");
  if (origins.length > MAX_COMPARE_SITES)
    return fail(`Compare up to ${MAX_COMPARE_SITES} sites at a time.`);

  // All sites crawl in parallel; a saved fresh report short-circuits the
  // crawl entirely. Comparisons cap each site at a tighter budget than a
  // solo audit — several full 700s budgets in parallel could outlive the
  // function's maxDuration, and a ranking doesn't need exhaustive depth
  // (150s covers ~2,000 pages at the crawler's pace; bigger sites report
  // as capped). Run any site solo for its full uncapped report.
  const COMPARE_SITE_BUDGET_MS = 150_000;
  const reports = await Promise.all(
    origins.map(async (origin): Promise<SiteAuditReport | null> => {
      try {
        const saved = await freshSiteAudit(ownerKey, origin);
        if (saved) return saved;
        const report = await runDeepSiteAudit(origin, {
          timeBudgetMs: COMPARE_SITE_BUDGET_MS,
        });
        if (!report.error) await saveSiteAudit(ownerKey, report);
        return report;
      } catch {
        return null;
      }
    }),
  );

  const sites = reports.map((r, i) =>
    r
      ? toCompareSite(r)
      : ({
          url: origins[i]!,
          host: new URL(origins[i]!).hostname.replace(/^www\./, ""),
          error: "The audit failed.",
          fromCache: false,
          score: 0,
          categoryScores: [],
          pagesCrawled: 0,
          thinPages: 0,
          missingMeta: 0,
          missingTitle: 0,
          missingH1: 0,
          imagesTotal: 0,
          imagesMissingAlt: 0,
          brokenLinks: 0,
          duplicateTitles: 0,
          fetchErrors: 0,
        } satisfies CompareSite),
  );

  const usable = sites.filter((s) => !s.error);
  if (usable.length < 2)
    return fail("Fewer than two sites could be audited — check the URLs.");

  let summary = "";
  try {
    summary = await comparativeSummary(sites.filter((s) => !s.error));
  } catch {
    // The side-by-side table stands on its own if the AI pass fails.
  }

  return { ok: true, sites, summary, generatedAt };
}
