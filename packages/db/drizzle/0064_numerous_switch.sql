ALTER TABLE "signature_requests" ADD COLUMN "body" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD COLUMN "public_token" text DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD COLUMN "fields" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD COLUMN "signed_values" jsonb;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD COLUMN "signed_name" text;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD COLUMN "signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD COLUMN "declined_reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "signature_requests_token_uq" ON "signature_requests" USING btree ("public_token");