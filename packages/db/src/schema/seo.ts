/**
 * SEO Engine schema — AI-driven content and search visibility for the agency
 * website. Tenant-scoped.
 *
 * `seo_keywords` is the tracked-term inventory (grouped into clusters);
 * `seo_rankings` is the position time series per keyword; `seo_content_drafts`
 * holds AI-generated articles working draft → approved → published;
 * `seo_visibility_checks` records whether AI answer engines mention the agency;
 * `seo_settings` is the one-row-per-tenant publishing configuration.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { websitePages } from "./website";

export const seoKeywordStatus = pgEnum("seo_keyword_status", [
  "tracked",
  "paused",
]);

export const seoKeywords = pgTable(
  "seo_keywords",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phrase: text("phrase").notNull(),
    /** Topical grouping, e.g. "workers comp" — drives one article per cluster. */
    cluster: text("cluster").notNull().default(""),
    /** Search intent: informational, commercial, transactional, navigational. */
    intent: text("intent").notNull().default("informational"),
    /** Monthly search volume, when a data source provides it. */
    volume: integer("volume"),
    /** 0-100 difficulty score, when a data source provides it. */
    difficulty: integer("difficulty"),
    status: seoKeywordStatus("status").notNull().default("tracked"),
    /** Page this keyword targets, once one exists. */
    targetPageId: uuid("target_page_id").references(() => websitePages.id, {
      onDelete: "set null",
    }),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("seo_keywords_tenant_idx").on(t.tenantId)],
);

export const seoRankingSource = pgEnum("seo_ranking_source", [
  "search_console",
  "dataforseo",
  "manual",
]);

export const seoRankings = pgTable(
  "seo_rankings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Denormalized for tenant-scoped queries. */
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    keywordId: uuid("keyword_id")
      .notNull()
      .references(() => seoKeywords.id, { onDelete: "cascade" }),
    /** Google position; null means not in the top 100. */
    position: integer("position"),
    source: seoRankingSource("source").notNull().default("manual"),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("seo_rankings_tenant_idx").on(t.tenantId),
    index("seo_rankings_keyword_idx").on(t.keywordId),
  ],
);

export const seoDraftStatus = pgEnum("seo_draft_status", [
  "draft",
  "in_review",
  "approved",
  "published",
  "discarded",
]);

export const seoContentDrafts = pgTable(
  "seo_content_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** URL slug the article publishes under, e.g. "flood-insurance-basics". */
    slug: text("slug").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    /** Markdown body. */
    body: text("body").notNull().default(""),
    status: seoDraftStatus("status").notNull().default("draft"),
    /** Keyword this draft targets. */
    keywordId: uuid("keyword_id").references(() => seoKeywords.id, {
      onDelete: "set null",
    }),
    /** Model that generated the body, for provenance. */
    model: text("model").notNull().default(""),
    /** Repo path the article was committed to once published. */
    publishedPath: text("published_path").notNull().default(""),
    /** Live URL once published. */
    publishedUrl: text("published_url").notNull().default(""),
    /** Commit that published it. */
    commitSha: text("commit_sha").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("seo_content_drafts_tenant_idx").on(t.tenantId)],
);

export const seoVisibilityEngine = pgEnum("seo_visibility_engine", [
  "chatgpt",
  "claude",
  "perplexity",
  "gemini",
  "google_ai_overview",
]);

export const seoVisibilityChecks = pgTable(
  "seo_visibility_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** The question a prospect would ask, e.g. "best insurance association in Oregon". */
    query: text("query").notNull(),
    engine: seoVisibilityEngine("engine").notNull(),
    /** Whether the agency was mentioned in the engine's answer. */
    mentioned: boolean("mentioned").notNull().default(false),
    /** The relevant slice of the engine's answer. */
    excerpt: text("excerpt").notNull().default(""),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("seo_visibility_checks_tenant_idx").on(t.tenantId)],
);

export const seoPublishMode = pgEnum("seo_publish_mode", [
  "github_commit",
  "manual",
]);

export const seoSettings = pgTable(
  "seo_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Canonical site origin, e.g. "https://www.piawest.com". */
    siteUrl: text("site_url").notNull().default(""),
    /** What the agency does and who it serves — grounds article generation. */
    brandBrief: text("brand_brief").notNull().default(""),
    publishMode: seoPublishMode("publish_mode").notNull().default("manual"),
    /** GitHub repo the site deploys from, e.g. "Sladed49er". */
    repoOwner: text("repo_owner").notNull().default(""),
    repoName: text("repo_name").notNull().default(""),
    repoBranch: text("repo_branch").notNull().default("main"),
    /** Directory articles are committed into, e.g. "content/news". */
    contentDir: text("content_dir").notNull().default(""),
    /** URL prefix articles appear under, e.g. "/news-releases-and-bulletins". */
    urlPrefix: text("url_prefix").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("seo_settings_tenant_uq").on(t.tenantId)],
);

export type SeoKeyword = typeof seoKeywords.$inferSelect;
export type NewSeoKeyword = typeof seoKeywords.$inferInsert;
export type SeoRanking = typeof seoRankings.$inferSelect;
export type NewSeoRanking = typeof seoRankings.$inferInsert;
export type SeoContentDraft = typeof seoContentDrafts.$inferSelect;
export type NewSeoContentDraft = typeof seoContentDrafts.$inferInsert;
export type SeoVisibilityCheck = typeof seoVisibilityChecks.$inferSelect;
export type NewSeoVisibilityCheck = typeof seoVisibilityChecks.$inferInsert;
export type SeoSettings = typeof seoSettings.$inferSelect;
export type NewSeoSettings = typeof seoSettings.$inferInsert;
