CREATE TYPE "public"."alert_status" AS ENUM('open', 'acknowledged');--> statement-breakpoint
CREATE TYPE "public"."metric_format" AS ENUM('money', 'number', 'percent');--> statement-breakpoint
CREATE TYPE "public"."metric_goal" AS ENUM('higher', 'lower');--> statement-breakpoint
CREATE TYPE "public"."rule_condition_type" AS ENUM('threshold', 'target', 'trend');--> statement-breakpoint
CREATE TYPE "public"."rule_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TABLE "tenant_metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric_id" uuid NOT NULL,
	"value" double precision DEFAULT 0 NOT NULL,
	"captured_on" date NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"spec" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"format" "metric_format" DEFAULT 'number' NOT NULL,
	"target" double precision,
	"goal_direction" "metric_goal" DEFAULT 'higher' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_rule_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"metric_id" uuid NOT NULL,
	"severity" "rule_severity" NOT NULL,
	"message" text NOT NULL,
	"value" double precision DEFAULT 0 NOT NULL,
	"status" "alert_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenant_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric_id" uuid NOT NULL,
	"name" text NOT NULL,
	"condition_type" "rule_condition_type" NOT NULL,
	"comparator" text DEFAULT '' NOT NULL,
	"threshold" double precision DEFAULT 0 NOT NULL,
	"window_days" integer DEFAULT 0 NOT NULL,
	"severity" "rule_severity" DEFAULT 'warning' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_metric_snapshots" ADD CONSTRAINT "tenant_metric_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_metric_snapshots" ADD CONSTRAINT "tenant_metric_snapshots_metric_id_tenant_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."tenant_metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_metrics" ADD CONSTRAINT "tenant_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_rule_alerts" ADD CONSTRAINT "tenant_rule_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_rule_alerts" ADD CONSTRAINT "tenant_rule_alerts_rule_id_tenant_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."tenant_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_rule_alerts" ADD CONSTRAINT "tenant_rule_alerts_metric_id_tenant_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."tenant_metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_rules" ADD CONSTRAINT "tenant_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_rules" ADD CONSTRAINT "tenant_rules_metric_id_tenant_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."tenant_metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_metric_snapshots_metric_idx" ON "tenant_metric_snapshots" USING btree ("metric_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_metric_snapshots_uq" ON "tenant_metric_snapshots" USING btree ("tenant_id","metric_id","captured_on");--> statement-breakpoint
CREATE INDEX "tenant_metrics_tenant_idx" ON "tenant_metrics" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_rule_alerts_tenant_idx" ON "tenant_rule_alerts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_rule_alerts_rule_idx" ON "tenant_rule_alerts" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "tenant_rules_tenant_idx" ON "tenant_rules" USING btree ("tenant_id");