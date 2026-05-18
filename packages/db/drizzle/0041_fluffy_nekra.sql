CREATE TYPE "public"."cross_sell_confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."cross_sell_source" AS ENUM('ai', 'manual');--> statement-breakpoint
CREATE TYPE "public"."cross_sell_status" AS ENUM('suggested', 'pursuing', 'quoted', 'won', 'dismissed');--> statement-breakpoint
CREATE TABLE "cross_sell_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"client_name" text DEFAULT '' NOT NULL,
	"line" text NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"estimated_premium_cents" integer DEFAULT 0 NOT NULL,
	"confidence" "cross_sell_confidence" DEFAULT 'medium' NOT NULL,
	"status" "cross_sell_status" DEFAULT 'suggested' NOT NULL,
	"source" "cross_sell_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cross_sell_opportunities" ADD CONSTRAINT "cross_sell_opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_sell_opportunities" ADD CONSTRAINT "cross_sell_opportunities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cross_sell_opportunities_tenant_idx" ON "cross_sell_opportunities" USING btree ("tenant_id");