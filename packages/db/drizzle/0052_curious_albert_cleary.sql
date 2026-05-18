CREATE TYPE "public"."event_registration_status" AS ENUM('registered', 'waitlisted', 'attended', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TABLE "membership_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"payment_date" date,
	"method" text DEFAULT '' NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_officers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"term_end" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"attendee_name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"status" "event_registration_status" DEFAULT 'registered' NOT NULL,
	"fee_paid_cents" integer DEFAULT 0 NOT NULL,
	"registered_on" date,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_list_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benefit_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"benefit_id" uuid NOT NULL,
	"member_name" text NOT NULL,
	"redeemed_on" date,
	"estimated_value_cents" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "membership_payments" ADD CONSTRAINT "membership_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_payments" ADD CONSTRAINT "membership_payments_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_officers" ADD CONSTRAINT "chapter_officers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_officers" ADD CONSTRAINT "chapter_officers_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_association_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."association_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_list_members" ADD CONSTRAINT "communication_list_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_list_members" ADD CONSTRAINT "communication_list_members_list_id_communication_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."communication_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_redemptions" ADD CONSTRAINT "benefit_redemptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_redemptions" ADD CONSTRAINT "benefit_redemptions_benefit_id_member_benefits_id_fk" FOREIGN KEY ("benefit_id") REFERENCES "public"."member_benefits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_payments_tenant_idx" ON "membership_payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "membership_payments_membership_idx" ON "membership_payments" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "chapter_officers_tenant_idx" ON "chapter_officers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "chapter_officers_chapter_idx" ON "chapter_officers" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "event_registrations_tenant_idx" ON "event_registrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_registrations_event_idx" ON "event_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "communication_list_members_tenant_idx" ON "communication_list_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "communication_list_members_list_idx" ON "communication_list_members" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "benefit_redemptions_tenant_idx" ON "benefit_redemptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "benefit_redemptions_benefit_idx" ON "benefit_redemptions" USING btree ("benefit_id");