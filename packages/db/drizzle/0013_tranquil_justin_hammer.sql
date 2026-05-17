CREATE TYPE "public"."employment_type" AS ENUM('w2', 'contractor');--> statement-breakpoint
CREATE TYPE "public"."pay_run_status" AS ENUM('draft', 'posted');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "pay_run_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pay_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employee_name" text NOT NULL,
	"gross_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"net_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"label" text NOT NULL,
	"pay_date" date,
	"status" "pay_run_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"employment_type" "employment_type" DEFAULT 'w2' NOT NULL,
	"period_pay_cents" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_name" text NOT NULL,
	"statement_date" date,
	"statement_balance_cents" integer DEFAULT 0 NOT NULL,
	"reconciled_balance_cents" integer DEFAULT 0 NOT NULL,
	"status" "reconciliation_status" DEFAULT 'in_progress' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pay_run_entries" ADD CONSTRAINT "pay_run_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_run_entries" ADD CONSTRAINT "pay_run_entries_pay_run_id_pay_runs_id_fk" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_run_entries" ADD CONSTRAINT "pay_run_entries_employee_id_payroll_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."payroll_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_runs" ADD CONSTRAINT "pay_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_employees" ADD CONSTRAINT "payroll_employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pay_run_entries_tenant_idx" ON "pay_run_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pay_run_entries_run_idx" ON "pay_run_entries" USING btree ("pay_run_id");--> statement-breakpoint
CREATE INDEX "pay_runs_tenant_idx" ON "pay_runs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payroll_employees_tenant_idx" ON "payroll_employees" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bank_reconciliations_tenant_idx" ON "bank_reconciliations" USING btree ("tenant_id");