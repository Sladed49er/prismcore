CREATE TYPE "public"."recurrence_frequency" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'annually');--> statement-breakpoint
CREATE TYPE "public"."recurring_task_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."task_workflow_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "recurring_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"assignee" text DEFAULT '' NOT NULL,
	"priority" "task_priority" DEFAULT 'normal' NOT NULL,
	"frequency" "recurrence_frequency" DEFAULT 'monthly' NOT NULL,
	"next_due_date" date,
	"status" "recurring_task_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"steps" text DEFAULT '' NOT NULL,
	"status" "task_workflow_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_tasks" ADD CONSTRAINT "recurring_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_workflows" ADD CONSTRAINT "task_workflows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_queues" ADD CONSTRAINT "task_queues_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_tasks_tenant_idx" ON "recurring_tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "task_workflows_tenant_idx" ON "task_workflows" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "task_queues_tenant_idx" ON "task_queues" USING btree ("tenant_id");