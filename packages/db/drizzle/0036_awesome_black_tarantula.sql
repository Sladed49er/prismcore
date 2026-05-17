CREATE TYPE "public"."billing_status" AS ENUM('none', 'trialing', 'active', 'past_due', 'canceled', 'suspended');--> statement-breakpoint
CREATE TABLE "tenant_billing" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" "billing_status" DEFAULT 'none' NOT NULL,
	"plan_key" text,
	"current_period_end" timestamp with time zone,
	"past_due_since" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_billing" ADD CONSTRAINT "tenant_billing_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;