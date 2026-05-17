CREATE TYPE "public"."call_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('ringing', 'completed', 'missed');--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"direction" "call_direction" DEFAULT 'inbound' NOT NULL,
	"from_number" text NOT NULL,
	"contact_name" text,
	"status" "call_status" DEFAULT 'completed' NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"ai_summary" text,
	"disposition" text,
	"provider" text DEFAULT 'manual' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_voip_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_voip_connections" ADD CONSTRAINT "tenant_voip_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calls_tenant_idx" ON "calls" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_voip_tenant_idx" ON "tenant_voip_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_voip_uq" ON "tenant_voip_connections" USING btree ("tenant_id","provider_id");