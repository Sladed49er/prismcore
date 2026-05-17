CREATE TYPE "public"."bill_status" AS ENUM('pending', 'partial', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."vendor_type" AS ENUM('carrier', 'supplier', 'service', 'other');--> statement-breakpoint
CREATE TYPE "public"."trust_entry_type" AS ENUM('premium_received', 'remitted', 'return', 'fee');--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"bill_number" text NOT NULL,
	"bill_date" date,
	"due_date" date,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"amount_paid_cents" integer DEFAULT 0 NOT NULL,
	"status" "bill_status" DEFAULT 'pending' NOT NULL,
	"memo" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "vendor_type" DEFAULT 'supplier' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"payment_terms" text DEFAULT 'Net 30' NOT NULL,
	"is_1099" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entry_type" "trust_entry_type" NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"party" text DEFAULT '' NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"entry_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_ledger_entries" ADD CONSTRAINT "trust_ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bills_tenant_idx" ON "bills" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bills_vendor_idx" ON "bills" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendors_tenant_idx" ON "vendors" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "trust_ledger_entries_tenant_idx" ON "trust_ledger_entries" USING btree ("tenant_id");