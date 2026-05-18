CREATE TABLE "call_digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"data" jsonb NOT NULL,
	"insights" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"call_id" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"estimated_value" text DEFAULT '' NOT NULL,
	"product_type" text DEFAULT '' NOT NULL,
	"due_date" date,
	"contact_name" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"call_id" uuid,
	"category" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"regulation" text DEFAULT '' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "intel_analyzed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "call_digests" ADD CONSTRAINT "call_digests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_insights" ADD CONSTRAINT "call_insights_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_insights" ADD CONSTRAINT "call_insights_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_flags" ADD CONSTRAINT "compliance_flags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_flags" ADD CONSTRAINT "compliance_flags_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_digests_tenant_idx" ON "call_digests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "call_insights_tenant_idx" ON "call_insights" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "call_insights_call_idx" ON "call_insights" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "compliance_flags_tenant_idx" ON "compliance_flags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "compliance_flags_call_idx" ON "compliance_flags" USING btree ("call_id");