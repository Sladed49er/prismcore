CREATE TYPE "public"."schedule_item_type" AS ENUM('vehicle', 'driver', 'location', 'equipment', 'other');--> statement-breakpoint
CREATE TYPE "public"."premium_audit_status" AS ENUM('scheduled', 'in_progress', 'completed', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."service_activity_status" AS ENUM('open', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."service_activity_type" AS ENUM('inquiry', 'change_request', 'coverage_review', 'claim_follow_up', 'document_request', 'other');--> statement-breakpoint
CREATE TYPE "public"."policy_document_type" AS ENUM('id_card', 'dec_page', 'certificate', 'endorsement_copy', 'application', 'other');--> statement-breakpoint
CREATE TABLE "insured_schedule_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"item_type" "schedule_item_type" DEFAULT 'other' NOT NULL,
	"description" text NOT NULL,
	"identifier" text DEFAULT '' NOT NULL,
	"value_cents" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"audit_type" text NOT NULL,
	"period_start" date,
	"period_end" date,
	"estimated_premium_cents" integer DEFAULT 0 NOT NULL,
	"audited_premium_cents" integer DEFAULT 0 NOT NULL,
	"status" "premium_audit_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"activity_type" "service_activity_type" DEFAULT 'inquiry' NOT NULL,
	"subject" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"assigned_to" text DEFAULT '' NOT NULL,
	"due_date" date,
	"status" "service_activity_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"document_type" "policy_document_type" DEFAULT 'other' NOT NULL,
	"title" text NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"issued_date" date,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "insured_schedule_items" ADD CONSTRAINT "insured_schedule_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insured_schedule_items" ADD CONSTRAINT "insured_schedule_items_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_audits" ADD CONSTRAINT "premium_audits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_audits" ADD CONSTRAINT "premium_audits_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_activities" ADD CONSTRAINT "service_activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_activities" ADD CONSTRAINT "service_activities_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_documents" ADD CONSTRAINT "policy_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_documents" ADD CONSTRAINT "policy_documents_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "insured_schedule_items_tenant_idx" ON "insured_schedule_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "insured_schedule_items_policy_idx" ON "insured_schedule_items" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "premium_audits_tenant_idx" ON "premium_audits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "premium_audits_policy_idx" ON "premium_audits" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "service_activities_tenant_idx" ON "service_activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_activities_policy_idx" ON "service_activities" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "policy_documents_tenant_idx" ON "policy_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "policy_documents_policy_idx" ON "policy_documents" USING btree ("policy_id");