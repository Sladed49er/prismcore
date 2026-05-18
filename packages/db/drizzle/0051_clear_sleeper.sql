CREATE TABLE "ams_phone_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"phone_number" text NOT NULL,
	"source_id" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ams_phone_index_unique" UNIQUE("tenant_id","provider","phone_number","source_id")
);
--> statement-breakpoint
ALTER TABLE "ams_phone_index" ADD CONSTRAINT "ams_phone_index_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ams_phone_index_lookup_idx" ON "ams_phone_index" USING btree ("tenant_id","provider","phone_number");