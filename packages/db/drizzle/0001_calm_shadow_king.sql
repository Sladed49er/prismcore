CREATE TYPE "public"."custom_field_type" AS ENUM('text', 'number', 'date', 'select', 'checkbox');--> statement-breakpoint
CREATE TABLE "tenant_custom_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_id" text NOT NULL,
	"entity_key" text NOT NULL,
	"field_key" text NOT NULL,
	"label" text NOT NULL,
	"field_type" "custom_field_type" DEFAULT 'text' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_custom_fields" ADD CONSTRAINT "tenant_custom_fields_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_custom_fields_tenant_idx" ON "tenant_custom_fields" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_custom_fields_uq" ON "tenant_custom_fields" USING btree ("tenant_id","entity_key","field_key");