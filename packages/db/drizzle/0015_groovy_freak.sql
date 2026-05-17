CREATE TYPE "public"."check_status" AS ENUM('printed', 'cleared', 'voided');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."surplus_lines_status" AS ENUM('pending', 'filed', 'paid');--> statement-breakpoint
CREATE TYPE "public"."quarterly_tax_status" AS ENUM('scheduled', 'paid');--> statement-breakpoint
CREATE TABLE "check_register" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"check_number" text NOT NULL,
	"payee" text NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"check_date" date,
	"memo" text DEFAULT '' NOT NULL,
	"status" "check_status" DEFAULT 'printed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" "period_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surplus_lines_tax" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_reference" text NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"premium_cents" integer DEFAULT 0 NOT NULL,
	"tax_rate_percent" text DEFAULT '' NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"stamping_fee_cents" integer DEFAULT 0 NOT NULL,
	"filing_fee_cents" integer DEFAULT 0 NOT NULL,
	"due_date" date,
	"status" "surplus_lines_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quarterly_tax_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tax_type" text NOT NULL,
	"year" text DEFAULT '' NOT NULL,
	"quarter" text DEFAULT 'Q1' NOT NULL,
	"estimated_cents" integer DEFAULT 0 NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"due_date" date,
	"status" "quarterly_tax_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "check_register" ADD CONSTRAINT "check_register_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surplus_lines_tax" ADD CONSTRAINT "surplus_lines_tax_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_tax_payments" ADD CONSTRAINT "quarterly_tax_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_register_tenant_idx" ON "check_register" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "accounting_periods_tenant_idx" ON "accounting_periods" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "surplus_lines_tax_tenant_idx" ON "surplus_lines_tax" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "quarterly_tax_payments_tenant_idx" ON "quarterly_tax_payments" USING btree ("tenant_id");