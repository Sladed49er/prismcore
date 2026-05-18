CREATE TYPE "public"."membership_status" AS ENUM('active', 'pending', 'lapsed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."membership_tier" AS ENUM('individual', 'professional', 'corporate', 'student', 'lifetime');--> statement-breakpoint
CREATE TYPE "public"."chapter_status" AS ENUM('active', 'forming', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."chapter_type" AS ENUM('geographic', 'functional', 'student');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('planned', 'registration_open', 'full', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('conference', 'workshop', 'webinar', 'meeting', 'networking');--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"member_name" text NOT NULL,
	"organization" text DEFAULT '' NOT NULL,
	"tier" "membership_tier" DEFAULT 'individual' NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"join_date" date,
	"renewal_date" date,
	"dues_cents" integer DEFAULT 0 NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "chapter_type" DEFAULT 'geographic' NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"leader_name" text DEFAULT '' NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"status" "chapter_status" DEFAULT 'active' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "association_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "event_type" DEFAULT 'workshop' NOT NULL,
	"start_date" date,
	"end_date" date,
	"location" text DEFAULT '' NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"registered_count" integer DEFAULT 0 NOT NULL,
	"ce_credits" integer DEFAULT 0 NOT NULL,
	"fee_cents" integer DEFAULT 0 NOT NULL,
	"status" "event_status" DEFAULT 'planned' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "association_events" ADD CONSTRAINT "association_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_tenant_idx" ON "memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "chapters_tenant_idx" ON "chapters" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "association_events_tenant_idx" ON "association_events" USING btree ("tenant_id");