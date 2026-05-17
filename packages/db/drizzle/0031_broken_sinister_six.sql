ALTER TABLE "calls" ADD COLUMN "ams_sync_status" text DEFAULT 'not_synced' NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "ams_sync_after" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "ams_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "ams_sync_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "ams_sync_error" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "ams_note_id" text;--> statement-breakpoint
CREATE INDEX "calls_ams_sync_idx" ON "calls" USING btree ("ams_sync_status","ams_sync_after") WHERE "calls"."ams_sync_status" = 'pending';