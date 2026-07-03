CREATE TABLE "seo_site_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_key" text NOT NULL,
	"site_url" text NOT NULL,
	"score" integer NOT NULL,
	"report" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "seo_site_audits_owner_site_idx" ON "seo_site_audits" USING btree ("owner_key","site_url","created_at");