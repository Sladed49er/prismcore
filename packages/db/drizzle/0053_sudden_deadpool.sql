CREATE TYPE "public"."field_mapping_status" AS ENUM('mapped', 'needs_review', 'skipped');--> statement-breakpoint
CREATE TABLE "contract_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"name" text NOT NULL,
	"doc_type" text DEFAULT 'agreement' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_field_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"source_field" text NOT NULL,
	"target_field" text DEFAULT '' NOT NULL,
	"transform" text DEFAULT '' NOT NULL,
	"status" "field_mapping_status" DEFAULT 'mapped' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_request_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"author_name" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_id_vendor_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."vendor_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_field_mappings" ADD CONSTRAINT "migration_field_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_field_mappings" ADD CONSTRAINT "migration_field_mappings_job_id_migration_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."migration_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_request_comments" ADD CONSTRAINT "website_request_comments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_request_comments" ADD CONSTRAINT "website_request_comments_request_id_website_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."website_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_documents_tenant_idx" ON "contract_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contract_documents_contract_idx" ON "contract_documents" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "migration_field_mappings_tenant_idx" ON "migration_field_mappings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "migration_field_mappings_job_idx" ON "migration_field_mappings" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "website_request_comments_tenant_idx" ON "website_request_comments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "website_request_comments_request_idx" ON "website_request_comments" USING btree ("request_id");