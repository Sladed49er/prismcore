ALTER TABLE "documents" ADD COLUMN "storage_url" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "mime_type" text;