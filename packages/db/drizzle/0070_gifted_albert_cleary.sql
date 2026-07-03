CREATE TABLE "seo_monitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"site_url" text NOT NULL,
	"last_score" integer,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "seo_monitors_user_site_uq" ON "seo_monitors" USING btree ("clerk_user_id","site_url");