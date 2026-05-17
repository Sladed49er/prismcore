CREATE TYPE "public"."claim_party_role" AS ENUM('claimant', 'insured', 'witness', 'adjuster', 'attorney', 'third_party', 'expert', 'other');--> statement-breakpoint
CREATE TYPE "public"."claim_litigation_status" AS ENUM('pre_suit', 'filed', 'discovery', 'trial', 'settled', 'dismissed', 'closed');--> statement-breakpoint
CREATE TABLE "claim_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"role" "claim_party_role" DEFAULT 'claimant' NOT NULL,
	"name" text NOT NULL,
	"organization" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_litigation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"case_caption" text NOT NULL,
	"court" text DEFAULT '' NOT NULL,
	"docket_number" text DEFAULT '' NOT NULL,
	"defense_attorney" text DEFAULT '' NOT NULL,
	"filed_date" date,
	"trial_date" date,
	"status" "claim_litigation_status" DEFAULT 'pre_suit' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_parties" ADD CONSTRAINT "claim_parties_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_parties" ADD CONSTRAINT "claim_parties_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_litigation" ADD CONSTRAINT "claim_litigation_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_litigation" ADD CONSTRAINT "claim_litigation_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_parties_tenant_idx" ON "claim_parties" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "claim_parties_claim_idx" ON "claim_parties" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claim_litigation_tenant_idx" ON "claim_litigation" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "claim_litigation_claim_idx" ON "claim_litigation" USING btree ("claim_id");