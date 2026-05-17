CREATE TYPE "public"."contingency_income_type" AS ENUM('contingency', 'profit_share', 'bonus', 'growth');--> statement-breakpoint
CREATE TYPE "public"."contingency_status" AS ENUM('projected', 'received', 'closed');--> statement-breakpoint
CREATE TABLE "contingency_income" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_name" text NOT NULL,
	"year" text DEFAULT '' NOT NULL,
	"income_type" "contingency_income_type" DEFAULT 'contingency' NOT NULL,
	"expected_cents" integer DEFAULT 0 NOT NULL,
	"received_cents" integer DEFAULT 0 NOT NULL,
	"status" "contingency_status" DEFAULT 'projected' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contingency_income" ADD CONSTRAINT "contingency_income_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contingency_income_tenant_idx" ON "contingency_income" USING btree ("tenant_id");