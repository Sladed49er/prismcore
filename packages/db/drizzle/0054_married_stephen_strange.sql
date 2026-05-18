ALTER TABLE "tenant_billing" ADD COLUMN "custom_price_cents" integer;--> statement-breakpoint
ALTER TABLE "tenant_billing" ADD COLUMN "comp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_billing" ADD COLUMN "billing_notes" text DEFAULT '' NOT NULL;