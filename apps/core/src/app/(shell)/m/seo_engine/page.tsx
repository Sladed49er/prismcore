import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import {
  listSeoKeywords,
  listSeoDrafts,
  getSeoSettings,
  listSeoVisibilityChecks,
  listSeoRankings,
} from "@/lib/seo";
import {
  SeoKeywordsPanel,
  type SeoKeywordDTO,
} from "@/components/seo-keywords-panel";
import {
  SeoDraftsPanel,
  type SeoDraftDTO,
} from "@/components/seo-drafts-panel";
import {
  SeoSettingsPanel,
  type SeoSettingsDTO,
} from "@/components/seo-settings-panel";
import { SeoAuditPanel } from "@/components/seo-audit-panel";
import { SeoSiteAuditPanel } from "@/components/seo-site-audit-panel";
import {
  SeoVisibilityPanel,
  type VisibilityCheckDTO,
} from "@/components/seo-visibility-panel";
import {
  SeoRankingsPanel,
  type RankingRowDTO,
} from "@/components/seo-rankings-panel";
import {
  auditUrl,
  deepAuditSite,
  loadSavedTenantAudit,
  runVisibilityChecks,
  refreshRankings,
} from "./actions";
import { listSiteAudits } from "@/lib/seo-audit-store";

/** The deep site crawl runs minutes — give the server actions headroom. */
export const maxDuration = 800;

/**
 * SEO Engine module — tracked keywords drive AI article drafts; a human
 * approves each draft before the publisher commits it to the site repo.
 */
export default async function SeoEnginePage() {
  await requireModule("seo_engine");
  const { config } = await loadCurrentTenant();
  const [
    keywordRows,
    draftRows,
    settingsRow,
    savedAudits,
    visibilityRows,
    rankingRows,
  ] = await Promise.all([
    listSeoKeywords(config.id),
    listSeoDrafts(config.id),
    getSeoSettings(config.id),
    listSiteAudits(`tenant:${config.id}`),
    listSeoVisibilityChecks(config.id),
    listSeoRankings(config.id),
  ]);

  // Latest + previous position per keyword — rows arrive newest-first.
  const phraseById = new Map(keywordRows.map((k) => [k.id, k.phrase]));
  const rankingsByKeyword = new Map<string, RankingRowDTO>();
  for (const ranking of rankingRows) {
    const phrase = phraseById.get(ranking.keywordId);
    if (!phrase) continue;
    const existing = rankingsByKeyword.get(ranking.keywordId);
    if (!existing) {
      rankingsByKeyword.set(ranking.keywordId, {
        phrase,
        position: ranking.position,
        previousPosition: null,
        checkedAt: ranking.checkedAt.toISOString(),
      });
    } else if (existing.previousPosition === null) {
      existing.previousPosition = ranking.position;
    }
  }
  const rankings = [...rankingsByKeyword.values()];

  // Latest check per query — the rows arrive newest-first.
  const latestChecks: VisibilityCheckDTO[] = [];
  const seenQueries = new Set<string>();
  for (const check of visibilityRows) {
    if (seenQueries.has(check.query)) continue;
    seenQueries.add(check.query);
    latestChecks.push({
      query: check.query,
      mentioned: check.mentioned,
      excerpt: check.excerpt,
      checkedAt: check.checkedAt.toISOString(),
    });
  }

  const keywords: SeoKeywordDTO[] = keywordRows.map((k) => ({
    id: k.id,
    phrase: k.phrase,
    cluster: k.cluster,
    intent: k.intent,
    status: k.status,
    notes: k.notes,
  }));

  const drafts: SeoDraftDTO[] = draftRows.map((d) => ({
    id: d.id,
    title: d.title,
    slug: d.slug,
    metaDescription: d.metaDescription,
    body: d.body,
    status: d.status,
    publishedUrl: d.publishedUrl,
  }));

  const settings: SeoSettingsDTO = {
    siteUrl: settingsRow?.siteUrl ?? "",
    brandBrief: settingsRow?.brandBrief ?? "",
    publishMode: settingsRow?.publishMode ?? "manual",
    repoOwner: settingsRow?.repoOwner ?? "",
    repoName: settingsRow?.repoName ?? "",
    repoBranch: settingsRow?.repoBranch ?? "main",
    contentDir: settingsRow?.contentDir ?? "",
    publishFormat:
      settingsRow?.publishFormat === "posts_json"
        ? "posts_json"
        : "markdown_file",
    urlPrefix: settingsRow?.urlPrefix ?? "",
  };

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">SEO Engine</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track keywords, draft articles with AI, approve, and publish to the
          site.
        </p>
      </header>
      <SeoDraftsPanel drafts={drafts} />
      <SeoKeywordsPanel keywords={keywords} />
      <SeoRankingsPanel rows={rankings} refresh={refreshRankings} />
      <SeoVisibilityPanel checks={latestChecks} run={runVisibilityChecks} />
      <SeoSiteAuditPanel
        action={deepAuditSite}
        saved={savedAudits}
        load={loadSavedTenantAudit}
      />
      <SeoAuditPanel action={auditUrl} />
      <SeoSettingsPanel settings={settings} />
    </div>
  );
}
