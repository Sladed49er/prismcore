CREATE TYPE "public"."contract_category" AS ENUM('software', 'services', 'lease', 'equipment', 'insurance', 'other');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('active', 'pending', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "vendor_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vendor_name" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"category" "contract_category" DEFAULT 'other' NOT NULL,
	"status" "contract_status" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"end_date" date,
	"annual_value_cents" integer DEFAULT 0 NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"notice_period_days" integer DEFAULT 0 NOT NULL,
	"owner_name" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendor_contracts" ADD CONSTRAINT "vendor_contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vendor_contracts_tenant_idx" ON "vendor_contracts" USING btree ("tenant_id");