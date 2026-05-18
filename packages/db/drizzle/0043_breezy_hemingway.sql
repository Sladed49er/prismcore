CREATE TABLE "bookscan_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"generated_by" text DEFAULT '' NOT NULL,
	"total_clients" integer DEFAULT 0 NOT NULL,
	"total_policies" integer DEFAULT 0 NOT NULL,
	"total_premium_cents" bigint DEFAULT 0 NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"composition" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookscan_reports" ADD CONSTRAINT "bookscan_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookscan_reports_tenant_idx" ON "bookscan_reports" USING btree ("tenant_id");