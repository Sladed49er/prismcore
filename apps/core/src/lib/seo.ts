import { desc, eq, and } from "drizzle-orm";
import {
  withTenantContext,
  seoKeywords,
  seoRankings,
  seoContentDrafts,
  seoVisibilityChecks,
  seoSettings,
  type SeoKeyword,
  type SeoRanking,
  type SeoContentDraft,
  type SeoVisibilityCheck,
  type SeoSettings,
} from "@prismcore/db";

/**
 * SEO Engine data layer — tracked keywords, ranking history, AI content
 * drafts, AI-answer-engine visibility checks, and per-tenant publishing
 * settings. RLS-scoped through `withTenantContext`.
 */

export type {
  SeoKeyword,
  SeoRanking,
  SeoContentDraft,
  SeoVisibilityCheck,
  SeoSettings,
};

export type SeoKeywordStatus = "tracked" | "paused";
export type SeoDraftStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "discarded";
export type SeoPublishMode = "github_commit" | "manual";
export type SeoPublishFormat = "markdown_file" | "posts_json";

/* ── Keywords ─────────────────────────────────────────────────────── */

export async function listSeoKeywords(
  tenantId: string,
): Promise<SeoKeyword[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(seoKeywords)
      .where(eq(seoKeywords.tenantId, tenantId))
      .orderBy(seoKeywords.cluster, seoKeywords.phrase),
  );
}

export async function createSeoKeyword(input: {
  tenantId: string;
  phrase: string;
  cluster: string;
  intent: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(seoKeywords).values(input);
  });
}

export async function updateSeoKeyword(input: {
  tenantId: string;
  id: string;
  phrase: string;
  cluster: string;
  intent: string;
  status: SeoKeywordStatus;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(seoKeywords)
      .set({ ...rest, updatedAt: new Date() })
      .where(and(eq(seoKeywords.tenantId, tenantId), eq(seoKeywords.id, id)));
  });
}

export async function deleteSeoKeyword(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(seoKeywords)
      .where(and(eq(seoKeywords.tenantId, tenantId), eq(seoKeywords.id, id)));
  });
}

/* ── Rankings ─────────────────────────────────────────────────────── */

export async function listSeoRankings(
  tenantId: string,
): Promise<SeoRanking[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(seoRankings)
      .where(eq(seoRankings.tenantId, tenantId))
      .orderBy(desc(seoRankings.checkedAt)),
  );
}

export async function recordSeoRanking(input: {
  tenantId: string;
  keywordId: string;
  position: number | null;
  source: "search_console" | "dataforseo" | "manual";
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(seoRankings).values(input);
  });
}

/* ── Content drafts ───────────────────────────────────────────────── */

export async function listSeoDrafts(
  tenantId: string,
): Promise<SeoContentDraft[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(seoContentDrafts)
      .where(eq(seoContentDrafts.tenantId, tenantId))
      .orderBy(desc(seoContentDrafts.createdAt)),
  );
}

export async function getSeoDraft(
  tenantId: string,
  id: string,
): Promise<SeoContentDraft | undefined> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(seoContentDrafts)
      .where(
        and(
          eq(seoContentDrafts.tenantId, tenantId),
          eq(seoContentDrafts.id, id),
        ),
      )
      .limit(1),
  );
  return rows[0];
}

export async function createSeoDraft(input: {
  tenantId: string;
  title: string;
  slug: string;
  metaDescription: string;
  body: string;
  keywordId: string | null;
  model: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(seoContentDrafts).values(input);
  });
}

export async function updateSeoDraft(input: {
  tenantId: string;
  id: string;
  title: string;
  slug: string;
  metaDescription: string;
  body: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(seoContentDrafts)
      .set({ ...rest, updatedAt: new Date() })
      .where(
        and(
          eq(seoContentDrafts.tenantId, tenantId),
          eq(seoContentDrafts.id, id),
        ),
      );
  });
}

export async function setSeoDraftStatus(input: {
  tenantId: string;
  id: string;
  status: SeoDraftStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(seoContentDrafts)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(seoContentDrafts.tenantId, input.tenantId),
          eq(seoContentDrafts.id, input.id),
        ),
      );
  });
}

export async function markSeoDraftPublished(input: {
  tenantId: string;
  id: string;
  publishedPath: string;
  publishedUrl: string;
  commitSha: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(seoContentDrafts)
      .set({ ...rest, status: "published", updatedAt: new Date() })
      .where(
        and(
          eq(seoContentDrafts.tenantId, tenantId),
          eq(seoContentDrafts.id, id),
        ),
      );
  });
}

export async function deleteSeoDraft(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(seoContentDrafts)
      .where(
        and(
          eq(seoContentDrafts.tenantId, tenantId),
          eq(seoContentDrafts.id, id),
        ),
      );
  });
}

/* ── Visibility checks ────────────────────────────────────────────── */

export async function listSeoVisibilityChecks(
  tenantId: string,
): Promise<SeoVisibilityCheck[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(seoVisibilityChecks)
      .where(eq(seoVisibilityChecks.tenantId, tenantId))
      .orderBy(desc(seoVisibilityChecks.checkedAt)),
  );
}

export async function recordSeoVisibilityCheck(input: {
  tenantId: string;
  query: string;
  engine: "chatgpt" | "claude" | "perplexity" | "gemini" | "google_ai_overview";
  mentioned: boolean;
  excerpt: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(seoVisibilityChecks).values(input);
  });
}

/* ── Settings ─────────────────────────────────────────────────────── */

export async function getSeoSettings(
  tenantId: string,
): Promise<SeoSettings | undefined> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(seoSettings)
      .where(eq(seoSettings.tenantId, tenantId))
      .limit(1),
  );
  return rows[0];
}

export async function upsertSeoSettings(input: {
  tenantId: string;
  siteUrl: string;
  brandBrief: string;
  publishMode: SeoPublishMode;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  contentDir: string;
  publishFormat: SeoPublishFormat;
  urlPrefix: string;
}): Promise<void> {
  const { tenantId, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    const existing = await tx
      .select({ id: seoSettings.id })
      .from(seoSettings)
      .where(eq(seoSettings.tenantId, tenantId))
      .limit(1);
    if (existing[0]) {
      await tx
        .update(seoSettings)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(seoSettings.tenantId, tenantId));
    } else {
      await tx.insert(seoSettings).values({ tenantId, ...rest });
    }
  });
}
