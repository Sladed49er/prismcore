CREATE TYPE "public"."claim_note_category" AS ENUM('diary', 'contact', 'coverage', 'investigation', 'other');--> statement-breakpoint
CREATE TYPE "public"."claim_reserve_type" AS ENUM('indemnity', 'expense', 'legal', 'medical');--> statement-breakpoint
CREATE TYPE "public"."claim_payment_status" AS ENUM('pending', 'issued', 'cleared', 'voided');--> statement-breakpoint
CREATE TYPE "public"."claim_payment_type" AS ENUM('indemnity', 'expense', 'legal', 'medical');--> statement-breakpoint
CREATE TYPE "public"."claim_recovery_status" AS ENUM('pursuing', 'recovered', 'closed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."claim_recovery_type" AS ENUM('subrogation', 'salvage', 'deductible', 'other');--> statement-breakpoint
CREATE TABLE "claim_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"note_date" date,
	"author" text DEFAULT '' NOT NULL,
	"category" "claim_note_category" DEFAULT 'diary' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_reserve_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"entry_date" date,
	"reserve_type" "claim_reserve_type" DEFAULT 'indemnity' NOT NULL,
	"change_cents" integer DEFAULT 0 NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"payment_date" date,
	"payee" text NOT NULL,
	"payment_type" "claim_payment_type" DEFAULT 'indemnity' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"check_number" text DEFAULT '' NOT NULL,
	"status" "claim_payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_recoveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"recovery_type" "claim_recovery_type" DEFAULT 'subrogation' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"expected_cents" integer DEFAULT 0 NOT NULL,
	"recovered_cents" integer DEFAULT 0 NOT NULL,
	"status" "claim_recovery_status" DEFAULT 'pursuing' NOT NULL,
	"recovery_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_notes" ADD CONSTRAINT "claim_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_notes" ADD CONSTRAINT "claim_notes_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_reserve_entries" ADD CONSTRAINT "claim_reserve_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_reserve_entries" ADD CONSTRAINT "claim_reserve_entries_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_payments" ADD CONSTRAINT "claim_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_payments" ADD CONSTRAINT "claim_payments_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_recoveries" ADD CONSTRAINT "claim_recoveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_recoveries" ADD CONSTRAINT "claim_recoveries_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_notes_tenant_idx" ON "claim_notes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "claim_notes_claim_idx" ON "claim_notes" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claim_reserve_entries_tenant_idx" ON "claim_reserve_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "claim_reserve_entries_claim_idx" ON "claim_reserve_entries" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claim_payments_tenant_idx" ON "claim_payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "claim_payments_claim_idx" ON "claim_payments" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claim_recoveries_tenant_idx" ON "claim_recoveries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "claim_recoveries_claim_idx" ON "claim_recoveries" USING btree ("claim_id");