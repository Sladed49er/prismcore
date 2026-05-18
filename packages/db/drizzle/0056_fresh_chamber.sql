CREATE TABLE "document_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"attached_by_name" text DEFAULT 'User' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_attachments_tenant_idx" ON "document_attachments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_attachments_entity_idx" ON "document_attachments" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "document_attachments_document_idx" ON "document_attachments" USING btree ("document_id");