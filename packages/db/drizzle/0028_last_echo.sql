CREATE TYPE "public"."carrier_appointment_status" AS ENUM('active', 'pending', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."carrier_contact_role" AS ENUM('underwriter', 'marketing', 'claims', 'billing', 'other');--> statement-breakpoint
CREATE TYPE "public"."underwriting_guideline_status" AS ENUM('current', 'under_review', 'retired');--> statement-breakpoint
CREATE TABLE "carrier_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"line_of_business" text DEFAULT '' NOT NULL,
	"appointment_number" text DEFAULT '' NOT NULL,
	"effective_date" date,
	"commission_rate_percent" text DEFAULT '' NOT NULL,
	"status" "carrier_appointment_status" DEFAULT 'active' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carrier_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"role" "carrier_contact_role" DEFAULT 'underwriter' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "underwriting_guidelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"line_of_business" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"guidelines" text DEFAULT '' NOT NULL,
	"status" "underwriting_guideline_status" DEFAULT 'current' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carrier_appointments" ADD CONSTRAINT "carrier_appointments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_appointments" ADD CONSTRAINT "carrier_appointments_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_contacts" ADD CONSTRAINT "carrier_contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_contacts" ADD CONSTRAINT "carrier_contacts_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_guidelines" ADD CONSTRAINT "underwriting_guidelines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_guidelines" ADD CONSTRAINT "underwriting_guidelines_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carrier_appointments_tenant_idx" ON "carrier_appointments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "carrier_appointments_carrier_idx" ON "carrier_appointments" USING btree ("carrier_id");--> statement-breakpoint
CREATE INDEX "carrier_contacts_tenant_idx" ON "carrier_contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "carrier_contacts_carrier_idx" ON "carrier_contacts" USING btree ("carrier_id");--> statement-breakpoint
CREATE INDEX "underwriting_guidelines_tenant_idx" ON "underwriting_guidelines" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "underwriting_guidelines_carrier_idx" ON "underwriting_guidelines" USING btree ("carrier_id");