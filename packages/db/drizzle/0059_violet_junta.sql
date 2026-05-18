CREATE TABLE "carrier_appetite_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"naics_prefix" text NOT NULL,
	"appetite" text DEFAULT 'neutral' NOT NULL,
	"line_of_business" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carrier_appetite_rules" ADD CONSTRAINT "carrier_appetite_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_appetite_rules" ADD CONSTRAINT "carrier_appetite_rules_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carrier_appetite_tenant_idx" ON "carrier_appetite_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "carrier_appetite_carrier_idx" ON "carrier_appetite_rules" USING btree ("carrier_id");