ALTER TABLE "document_analyses" ALTER COLUMN "document_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_analyses" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "document_analyses" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "document_analyses" ADD COLUMN "extracted_data" jsonb;--> statement-breakpoint
ALTER TABLE "document_analyses" ADD CONSTRAINT "document_analyses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;