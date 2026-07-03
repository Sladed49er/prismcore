CREATE TYPE "public"."seo_draft_status" AS ENUM('draft', 'in_review', 'approved', 'published', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."seo_keyword_status" AS ENUM('tracked', 'paused');--> statement-breakpoint
CREATE TYPE "public"."seo_publish_mode" AS ENUM('github_commit', 'manual');--> statement-breakpoint
CREATE TYPE "public"."seo_ranking_source" AS ENUM('search_console', 'dataforseo', 'manual');--> statement-breakpoint
CREATE TYPE "public"."seo_visibility_engine" AS ENUM('chatgpt', 'claude', 'perplexity', 'gemini', 'google_ai_overview');--> statement-breakpoint
CREATE TABLE "seo_content_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text DEFAULT '' NOT NULL,
	"meta_description" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" "seo_draft_status" DEFAULT 'draft' NOT NULL,
	"keyword_id" uuid,
	"model" text DEFAULT '' NOT NULL,
	"published_path" text DEFAULT '' NOT NULL,
	"published_url" text DEFAULT '' NOT NULL,
	"commit_sha" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phrase" text NOT NULL,
	"cluster" text DEFAULT '' NOT NULL,
	"intent" text DEFAULT 'informational' NOT NULL,
	"volume" integer,
	"difficulty" integer,
	"status" "seo_keyword_status" DEFAULT 'tracked' NOT NULL,
	"target_page_id" uuid,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_rankings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"position" integer,
	"source" "seo_ranking_source" DEFAULT 'manual' NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_url" text DEFAULT '' NOT NULL,
	"brand_brief" text DEFAULT '' NOT NULL,
	"publish_mode" "seo_publish_mode" DEFAULT 'manual' NOT NULL,
	"repo_owner" text DEFAULT '' NOT NULL,
	"repo_name" text DEFAULT '' NOT NULL,
	"repo_branch" text DEFAULT 'main' NOT NULL,
	"content_dir" text DEFAULT '' NOT NULL,
	"url_prefix" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_visibility_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"query" text NOT NULL,
	"engine" "seo_visibility_engine" NOT NULL,
	"mentioned" boolean DEFAULT false NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_content_drafts" ADD CONSTRAINT "seo_content_drafts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_content_drafts" ADD CONSTRAINT "seo_content_drafts_keyword_id_seo_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."seo_keywords"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_keywords" ADD CONSTRAINT "seo_keywords_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_keywords" ADD CONSTRAINT "seo_keywords_target_page_id_website_pages_id_fk" FOREIGN KEY ("target_page_id") REFERENCES "public"."website_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_rankings" ADD CONSTRAINT "seo_rankings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_rankings" ADD CONSTRAINT "seo_rankings_keyword_id_seo_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."seo_keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_settings" ADD CONSTRAINT "seo_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_visibility_checks" ADD CONSTRAINT "seo_visibility_checks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seo_content_drafts_tenant_idx" ON "seo_content_drafts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "seo_keywords_tenant_idx" ON "seo_keywords" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "seo_rankings_tenant_idx" ON "seo_rankings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "seo_rankings_keyword_idx" ON "seo_rankings" USING btree ("keyword_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_settings_tenant_uq" ON "seo_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "seo_visibility_checks_tenant_idx" ON "seo_visibility_checks" USING btree ("tenant_id");