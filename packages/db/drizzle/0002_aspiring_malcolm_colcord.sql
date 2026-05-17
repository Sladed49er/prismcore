CREATE TYPE "public"."carrier_api_status" AS ENUM('live', 'coming_soon');--> statement-breakpoint
CREATE TYPE "public"."carrier_type" AS ENUM('carrier', 'mga');--> statement-breakpoint
CREATE TABLE "clearinghouse_carriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "carrier_type" DEFAULT 'mga' NOT NULL,
	"description" text NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"states" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"appetite" text DEFAULT '' NOT NULL,
	"api_status" "carrier_api_status" DEFAULT 'live' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clearinghouse_carriers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tenant_carrier_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_carrier_connections" ADD CONSTRAINT "tenant_carrier_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_carrier_connections" ADD CONSTRAINT "tenant_carrier_connections_carrier_id_clearinghouse_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."clearinghouse_carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_carrier_tenant_idx" ON "tenant_carrier_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_carrier_uq" ON "tenant_carrier_connections" USING btree ("tenant_id","carrier_id");