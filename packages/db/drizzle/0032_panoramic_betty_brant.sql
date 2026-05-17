CREATE TYPE "public"."customization_actor" AS ENUM('user', 'ai');--> statement-breakpoint
CREATE TABLE "tenant_branding" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"workspace_name" text,
	"accent_color" text DEFAULT '#4f46e5' NOT NULL,
	"logo_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_customization_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_type" "customization_actor" NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"undo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reverted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenant_option_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"option_set_id" uuid NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_option_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"set_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_core_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_saved_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"list_key" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_terminology" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_key" text NOT NULL,
	"label" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_customization_log" ADD CONSTRAINT "tenant_customization_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_option_items" ADD CONSTRAINT "tenant_option_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_option_items" ADD CONSTRAINT "tenant_option_items_option_set_id_tenant_option_sets_id_fk" FOREIGN KEY ("option_set_id") REFERENCES "public"."tenant_option_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_option_sets" ADD CONSTRAINT "tenant_option_sets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_saved_views" ADD CONSTRAINT "tenant_saved_views_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_terminology" ADD CONSTRAINT "tenant_terminology_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_customization_log_tenant_idx" ON "tenant_customization_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_option_items_set_idx" ON "tenant_option_items" USING btree ("option_set_id");--> statement-breakpoint
CREATE INDEX "tenant_option_items_tenant_idx" ON "tenant_option_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_option_sets_tenant_idx" ON "tenant_option_sets" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_option_sets_uq" ON "tenant_option_sets" USING btree ("tenant_id","set_key");--> statement-breakpoint
CREATE INDEX "tenant_saved_views_tenant_idx" ON "tenant_saved_views" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_saved_views_list_idx" ON "tenant_saved_views" USING btree ("tenant_id","list_key");--> statement-breakpoint
CREATE INDEX "tenant_terminology_tenant_idx" ON "tenant_terminology" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_terminology_uq" ON "tenant_terminology" USING btree ("tenant_id","term_key");