CREATE TYPE "public"."endorsement_status" AS ENUM('pending', 'issued', 'voided');--> statement-breakpoint
CREATE TYPE "public"."cancellation_status" AS ENUM('requested', 'processed', 'reinstated');--> statement-breakpoint
CREATE TYPE "public"."cancellation_type" AS ENUM('flat', 'pro_rata', 'short_rate');--> statement-breakpoint
CREATE TYPE "public"."premium_installment_status" AS ENUM('scheduled', 'paid');--> statement-breakpoint
CREATE TABLE "policy_coverages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"coverage_type" text NOT NULL,
	"limit_text" text DEFAULT '' NOT NULL,
	"deductible_cents" integer DEFAULT 0 NOT NULL,
	"premium_cents" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_endorsements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"endorsement_number" text NOT NULL,
	"effective_date" date,
	"description" text DEFAULT '' NOT NULL,
	"premium_change_cents" integer DEFAULT 0 NOT NULL,
	"status" "endorsement_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_cancellations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"request_date" date,
	"effective_date" date,
	"reason" text DEFAULT '' NOT NULL,
	"cancellation_type" "cancellation_type" DEFAULT 'pro_rata' NOT NULL,
	"return_premium_cents" integer DEFAULT 0 NOT NULL,
	"status" "cancellation_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"installment_number" integer DEFAULT 1 NOT NULL,
	"due_date" date,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"status" "premium_installment_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policy_coverages" ADD CONSTRAINT "policy_coverages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_coverages" ADD CONSTRAINT "policy_coverages_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_endorsements" ADD CONSTRAINT "policy_endorsements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_endorsements" ADD CONSTRAINT "policy_endorsements_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_cancellations" ADD CONSTRAINT "policy_cancellations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_cancellations" ADD CONSTRAINT "policy_cancellations_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_installments" ADD CONSTRAINT "premium_installments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_installments" ADD CONSTRAINT "premium_installments_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "policy_coverages_tenant_idx" ON "policy_coverages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "policy_coverages_policy_idx" ON "policy_coverages" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "policy_endorsements_tenant_idx" ON "policy_endorsements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "policy_endorsements_policy_idx" ON "policy_endorsements" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "policy_cancellations_tenant_idx" ON "policy_cancellations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "policy_cancellations_policy_idx" ON "policy_cancellations" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "premium_installments_tenant_idx" ON "premium_installments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "premium_installments_policy_idx" ON "premium_installments" USING btree ("policy_id");