ALTER TYPE "public"."call_status" ADD VALUE 'in_progress' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."call_status" ADD VALUE 'voicemail';--> statement-breakpoint
CREATE TABLE "tenant_ams_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "to_number" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "provider_call_id" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "master_call_id" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "agent_name" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "agent_email" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "matched_contact_id" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "matched_contact_name" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "recording_url" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "transcript" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant_ams_connections" ADD CONSTRAINT "tenant_ams_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_ams_uq" ON "tenant_ams_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calls_provider_call_uq" ON "calls" USING btree ("tenant_id","provider_call_id") WHERE "calls"."provider_call_id" is not null;