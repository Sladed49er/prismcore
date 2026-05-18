CREATE TABLE "document_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"document_id" uuid NOT NULL,
	"compare_document_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"generated_by" text DEFAULT 'User' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "document_analyses" ADD CONSTRAINT "document_analyses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_analyses" ADD CONSTRAINT "document_analyses_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_analyses" ADD CONSTRAINT "document_analyses_compare_document_id_documents_id_fk" FOREIGN KEY ("compare_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_analyses_tenant_idx" ON "document_analyses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_analyses_document_idx" ON "document_analyses" USING btree ("document_id");