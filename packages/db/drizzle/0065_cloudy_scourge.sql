CREATE TABLE "membership_dues_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"period_label" text NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"issue_date" date,
	"due_date" date,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "membership_payments" ADD COLUMN "invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "membership_dues_invoices" ADD CONSTRAINT "membership_dues_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_dues_invoices" ADD CONSTRAINT "membership_dues_invoices_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_dues_invoices_tenant_idx" ON "membership_dues_invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "membership_dues_invoices_membership_idx" ON "membership_dues_invoices" USING btree ("membership_id");