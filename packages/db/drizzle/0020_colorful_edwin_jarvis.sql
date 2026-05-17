CREATE TYPE "public"."producer_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."commission_statement_status" AS ENUM('received', 'reconciled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."producer_payout_status" AS ENUM('scheduled', 'paid');--> statement-breakpoint
CREATE TABLE "producers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"default_rate_percent" text DEFAULT '' NOT NULL,
	"status" "producer_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"commission_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"share_percent" text DEFAULT '' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_name" text NOT NULL,
	"statement_date" date,
	"period_label" text DEFAULT '' NOT NULL,
	"expected_cents" integer DEFAULT 0 NOT NULL,
	"reported_cents" integer DEFAULT 0 NOT NULL,
	"status" "commission_statement_status" DEFAULT 'received' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producer_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"payout_date" date,
	"period_label" text DEFAULT '' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"method" text DEFAULT 'check' NOT NULL,
	"status" "producer_payout_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "producers" ADD CONSTRAINT "producers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_producer_id_producers_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_statements" ADD CONSTRAINT "commission_statements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_payouts" ADD CONSTRAINT "producer_payouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_payouts" ADD CONSTRAINT "producer_payouts_producer_id_producers_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "producers_tenant_idx" ON "producers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "commission_splits_tenant_idx" ON "commission_splits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "commission_splits_commission_idx" ON "commission_splits" USING btree ("commission_id");--> statement-breakpoint
CREATE INDEX "commission_splits_producer_idx" ON "commission_splits" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "commission_statements_tenant_idx" ON "commission_statements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "producer_payouts_tenant_idx" ON "producer_payouts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "producer_payouts_producer_idx" ON "producer_payouts" USING btree ("producer_id");