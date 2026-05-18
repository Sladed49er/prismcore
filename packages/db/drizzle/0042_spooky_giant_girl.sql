CREATE TYPE "public"."specialty_market_type" AS ENUM('mga', 'wholesaler', 'surplus_carrier', 'program', 'other');--> statement-breakpoint
CREATE TABLE "specialty_markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"market_type" "specialty_market_type" DEFAULT 'mga' NOT NULL,
	"appetite" text DEFAULT '' NOT NULL,
	"lines_of_business" text DEFAULT '' NOT NULL,
	"states" text DEFAULT '' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specialty_markets" ADD CONSTRAINT "specialty_markets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "specialty_markets_tenant_idx" ON "specialty_markets" USING btree ("tenant_id");