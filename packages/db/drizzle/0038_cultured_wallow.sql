CREATE TYPE "public"."vault_category" AS ENUM('carrier', 'banking', 'software', 'system', 'other');--> statement-breakpoint
CREATE TABLE "vault_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "vault_category" DEFAULT 'other' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"username" text DEFAULT '' NOT NULL,
	"secret" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vault_credentials" ADD CONSTRAINT "vault_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vault_credentials_tenant_idx" ON "vault_credentials" USING btree ("tenant_id");