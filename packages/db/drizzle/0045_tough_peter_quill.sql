CREATE TABLE "bank_feed_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"fc_account_id" text NOT NULL,
	"institution_name" text DEFAULT '' NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"last4" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"subcategory" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"balance_cents" bigint DEFAULT 0 NOT NULL,
	"balance_currency" text DEFAULT 'usd' NOT NULL,
	"balance_refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_feed_accounts_fc_account_id_unique" UNIQUE("fc_account_id")
);
--> statement-breakpoint
CREATE TABLE "bank_feed_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"fc_transaction_id" text NOT NULL,
	"amount_cents" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'posted' NOT NULL,
	"transacted_at" timestamp with time zone,
	"category" text DEFAULT '' NOT NULL,
	"reconciled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_feed_transactions_fc_transaction_id_unique" UNIQUE("fc_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "bank_feed_accounts" ADD CONSTRAINT "bank_feed_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_feed_transactions" ADD CONSTRAINT "bank_feed_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_feed_transactions" ADD CONSTRAINT "bank_feed_transactions_account_id_bank_feed_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."bank_feed_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_feed_accounts_tenant_idx" ON "bank_feed_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bank_feed_transactions_tenant_idx" ON "bank_feed_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bank_feed_transactions_account_idx" ON "bank_feed_transactions" USING btree ("account_id");