CREATE TABLE "custom_object_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"plural_label" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'box' NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"title_field_key" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_object_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_object_definitions" ADD CONSTRAINT "custom_object_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_object_records" ADD CONSTRAINT "custom_object_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_object_records" ADD CONSTRAINT "custom_object_records_definition_id_custom_object_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."custom_object_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_object_definitions_tenant_idx" ON "custom_object_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_object_definitions_slug_uq" ON "custom_object_definitions" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "custom_object_records_tenant_idx" ON "custom_object_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "custom_object_records_definition_idx" ON "custom_object_records" USING btree ("definition_id");