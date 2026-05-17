CREATE TYPE "public"."tenant_status" AS ENUM('trial', 'active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."tenant_tier" AS ENUM('trial', 'starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TABLE "tenant_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"clerk_org_id" text,
	"vertical" text DEFAULT 'insurance' NOT NULL,
	"tier" "tenant_tier" DEFAULT 'trial' NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_modules_tenant_idx" ON "tenant_modules" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_modules_tenant_module_uq" ON "tenant_modules" USING btree ("tenant_id","module_id");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_clerk_uq" ON "users" USING btree ("tenant_id","clerk_user_id");