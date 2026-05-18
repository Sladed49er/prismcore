CREATE TYPE "public"."communication_list_type" AS ENUM('committee', 'distribution', 'working_group', 'board');--> statement-breakpoint
CREATE TYPE "public"."member_benefit_category" AS ENUM('discount', 'service', 'resource', 'insurance', 'education', 'other');--> statement-breakpoint
CREATE TYPE "public"."member_portal_status" AS ENUM('invited', 'active', 'revoked');--> statement-breakpoint
CREATE TABLE "communication_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "communication_list_type" DEFAULT 'distribution' NOT NULL,
	"purpose" text DEFAULT '' NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"owner_name" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_benefits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"partner_name" text DEFAULT '' NOT NULL,
	"category" "member_benefit_category" DEFAULT 'discount' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"redemption_details" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_portal_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"member_name" text DEFAULT '' NOT NULL,
	"token" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"status" "member_portal_status" DEFAULT 'invited' NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_portal_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "communication_lists" ADD CONSTRAINT "communication_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_benefits" ADD CONSTRAINT "member_benefits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_portal_invitations" ADD CONSTRAINT "member_portal_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_portal_invitations" ADD CONSTRAINT "member_portal_invitations_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "communication_lists_tenant_idx" ON "communication_lists" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "member_benefits_tenant_idx" ON "member_benefits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "member_portal_invitations_tenant_idx" ON "member_portal_invitations" USING btree ("tenant_id");