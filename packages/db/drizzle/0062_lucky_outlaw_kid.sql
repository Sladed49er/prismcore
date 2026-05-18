CREATE TABLE "intake_form_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"public_token" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"lead_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "intake_form_definitions" ADD CONSTRAINT "intake_form_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_submissions" ADD CONSTRAINT "intake_form_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_submissions" ADD CONSTRAINT "intake_form_submissions_form_id_intake_form_definitions_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."intake_form_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intake_form_definitions_tenant_idx" ON "intake_form_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intake_form_definitions_token_uq" ON "intake_form_definitions" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "intake_form_submissions_tenant_idx" ON "intake_form_submissions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "intake_form_submissions_form_idx" ON "intake_form_submissions" USING btree ("form_id");