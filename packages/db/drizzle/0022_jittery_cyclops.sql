CREATE TYPE "public"."remarketing_quote_status" AS ENUM('requested', 'received', 'declined', 'selected');--> statement-breakpoint
CREATE TYPE "public"."renewal_offer_status" AS ENUM('draft', 'presented', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."retention_outcome" AS ENUM('renewed', 'rewritten', 'lost', 'non_renewed');--> statement-breakpoint
CREATE TYPE "public"."retention_reason" AS ENUM('price', 'coverage', 'service', 'carrier_exit', 'claims', 'other');--> statement-breakpoint
CREATE TABLE "remarketing_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"renewal_id" uuid NOT NULL,
	"carrier_name" text NOT NULL,
	"quoted_premium_cents" integer DEFAULT 0 NOT NULL,
	"coverage_summary" text DEFAULT '' NOT NULL,
	"status" "remarketing_quote_status" DEFAULT 'requested' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renewal_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"renewal_id" uuid NOT NULL,
	"carrier_name" text DEFAULT '' NOT NULL,
	"offer_date" date,
	"premium_cents" integer DEFAULT 0 NOT NULL,
	"prior_premium_cents" integer DEFAULT 0 NOT NULL,
	"term_summary" text DEFAULT '' NOT NULL,
	"expires_date" date,
	"status" "renewal_offer_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"renewal_id" uuid NOT NULL,
	"outcome" "retention_outcome" DEFAULT 'renewed' NOT NULL,
	"reason_code" "retention_reason" DEFAULT 'other' NOT NULL,
	"prior_premium_cents" integer DEFAULT 0 NOT NULL,
	"new_premium_cents" integer DEFAULT 0 NOT NULL,
	"recorded_date" date,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "remarketing_quotes" ADD CONSTRAINT "remarketing_quotes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remarketing_quotes" ADD CONSTRAINT "remarketing_quotes_renewal_id_renewals_id_fk" FOREIGN KEY ("renewal_id") REFERENCES "public"."renewals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_offers" ADD CONSTRAINT "renewal_offers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_offers" ADD CONSTRAINT "renewal_offers_renewal_id_renewals_id_fk" FOREIGN KEY ("renewal_id") REFERENCES "public"."renewals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_records" ADD CONSTRAINT "retention_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_records" ADD CONSTRAINT "retention_records_renewal_id_renewals_id_fk" FOREIGN KEY ("renewal_id") REFERENCES "public"."renewals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "remarketing_quotes_tenant_idx" ON "remarketing_quotes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "remarketing_quotes_renewal_idx" ON "remarketing_quotes" USING btree ("renewal_id");--> statement-breakpoint
CREATE INDEX "renewal_offers_tenant_idx" ON "renewal_offers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "renewal_offers_renewal_idx" ON "renewal_offers" USING btree ("renewal_id");--> statement-breakpoint
CREATE INDEX "retention_records_tenant_idx" ON "retention_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "retention_records_renewal_idx" ON "retention_records" USING btree ("renewal_id");