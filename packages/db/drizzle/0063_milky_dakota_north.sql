ALTER TABLE "acord_forms" ADD COLUMN "policy_id" uuid;--> statement-breakpoint
ALTER TABLE "acord_forms" ADD COLUMN "field_values" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "acord_forms" ADD CONSTRAINT "acord_forms_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE set null ON UPDATE no action;