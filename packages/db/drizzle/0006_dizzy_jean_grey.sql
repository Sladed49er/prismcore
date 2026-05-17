CREATE TYPE "public"."policy_status" AS ENUM('quoted', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"policy_number" text NOT NULL,
	"line_of_business" text DEFAULT '' NOT NULL,
	"carrier" text DEFAULT '' NOT NULL,
	"status" "policy_status" DEFAULT 'quoted' NOT NULL,
	"effective_date" date,
	"expiration_date" date,
	"premium_cents" integer DEFAULT 0 NOT NULL,
	"custom_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "policies_tenant_idx" ON "policies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "policies_client_idx" ON "policies" USING btree ("client_id");