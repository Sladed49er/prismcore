CREATE TYPE "public"."household_risk_profile" AS ENUM('conservative', 'moderate', 'aggressive');--> statement-breakpoint
CREATE TYPE "public"."household_status" AS ENUM('prospect', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."household_type" AS ENUM('family', 'individual', 'trust', 'business');--> statement-breakpoint
CREATE TYPE "public"."tax_engagement_status" AS ENUM('not_started', 'in_progress', 'in_review', 'filed', 'extended');--> statement-breakpoint
CREATE TYPE "public"."tax_engagement_type" AS ENUM('form_1040', 'form_1120', 'form_1120s', 'form_1065', 'form_990', 'other');--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"primary_contact_name" text DEFAULT '' NOT NULL,
	"advisor_name" text DEFAULT '' NOT NULL,
	"type" "household_type" DEFAULT 'family' NOT NULL,
	"aum_cents" bigint DEFAULT 0 NOT NULL,
	"risk_profile" "household_risk_profile" DEFAULT 'moderate' NOT NULL,
	"status" "household_status" DEFAULT 'prospect' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"tax_year" integer NOT NULL,
	"engagement_type" "tax_engagement_type" DEFAULT 'form_1040' NOT NULL,
	"status" "tax_engagement_status" DEFAULT 'not_started' NOT NULL,
	"due_date" date,
	"fee_cents" integer DEFAULT 0 NOT NULL,
	"preparer_name" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_engagements" ADD CONSTRAINT "tax_engagements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "households_tenant_idx" ON "households" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tax_engagements_tenant_idx" ON "tax_engagements" USING btree ("tenant_id");