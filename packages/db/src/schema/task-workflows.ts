/** Task workflows schema — named multi-step processes. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const taskWorkflowStatus = pgEnum("task_workflow_status", [
  "draft",
  "active",
  "archived",
]);

export const taskWorkflows = pgTable(
  "task_workflows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** The ordered steps of the workflow, one per line. */
    steps: text("steps").notNull().default(""),
    status: taskWorkflowStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("task_workflows_tenant_idx").on(t.tenantId)],
);

export type TaskWorkflow = typeof taskWorkflows.$inferSelect;
export type NewTaskWorkflow = typeof taskWorkflows.$inferInsert;
