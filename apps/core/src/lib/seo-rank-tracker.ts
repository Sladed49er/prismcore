import {
  listSeoKeywords,
  getSeoSettings,
  recordSeoRanking,
} from "@/lib/seo";
import { searchAnalyticsByQuery } from "@/lib/gsc-client";

/**
 * Rank tracking — real Google positions from Search Console.
 *
 * One Search Analytics query pulls the site's per-query performance for the
 * last week; each tracked keyword is matched against it (exact query match).
 * A keyword with no impressions gets a null position ("not ranking"), which
 * is itself a data point. Appends to `seo_rankings`, building the position
 * time series.
 */

export interface RankRun {
  checked: number;
  ranking: number;
}

export async function collectTenantRankings(
  tenantId: string,
): Promise<RankRun> {
  const [keywords, settings] = await Promise.all([
    listSeoKeywords(tenantId),
    getSeoSettings(tenantId),
  ]);
  if (!settings?.siteUrl) {
    throw new Error("No site URL configured in SEO settings.");
  }
  const tracked = keywords.filter((k) => k.status === "tracked");
  if (tracked.length === 0) return { checked: 0, ranking: 0 };

  const byQuery = await searchAnalyticsByQuery(settings.siteUrl);

  const run: RankRun = { checked: 0, ranking: 0 };
  for (const keyword of tracked) {
    const stats = byQuery.get(keyword.phrase.trim().toLowerCase());
    const position = stats ? Math.round(stats.position) : null;
    await recordSeoRanking({
      tenantId,
      keywordId: keyword.id,
      position,
      source: "search_console",
    });
    run.checked++;
    if (position !== null) run.ranking++;
  }
  return run;
}
