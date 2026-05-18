CREATE TYPE "public"."website_page_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."website_request_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."website_request_status" AS ENUM('submitted', 'in_progress', 'in_review', 'completed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."website_request_type" AS ENUM('content_update', 'new_page', 'design', 'bug', 'seo', 'other');--> statement-breakpoint
CREATE TABLE "website_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text DEFAULT '' NOT NULL,
	"status" "website_page_status" DEFAULT 'draft' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" "website_request_type" DEFAULT 'content_update' NOT NULL,
	"priority" "website_request_priority" DEFAULT 'normal' NOT NULL,
	"status" "website_request_status" DEFAULT 'submitted' NOT NULL,
	"requestor_name" text DEFAULT '' NOT NULL,
	"page_ref" text DEFAULT '' NOT NULL,
	"resolution" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_pages" ADD CONSTRAINT "website_pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_requests" ADD CONSTRAINT "website_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "website_pages_tenant_idx" ON "website_pages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "website_requests_tenant_idx" ON "website_requests" USING btree ("tenant_id");