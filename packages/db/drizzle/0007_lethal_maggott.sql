CREATE TYPE "public"."renewal_stage" AS ENUM('not_started', 'in_progress', 'quoted', 'renewed', 'lost');--> statement-breakpoint
CREATE TABLE "renewals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"stage" "renewal_stage" DEFAULT 'not_started' NOT NULL,
	"due_date" date,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "renewals" ADD CONSTRAINT "renewals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewals" ADD CONSTRAINT "renewals_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "renewals_tenant_idx" ON "renewals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "renewals_policy_idx" ON "renewals" USING btree ("policy_id");