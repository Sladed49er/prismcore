/**
 * Tasks schema — task management. Tenant-scoped, RLS-isolated.
 * `customValues` carries per-tenant custom-field values for the "task" entity.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  date,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const taskStatus = pgEnum("task_status", [
  "open",
  "in_progress",
  "done",
]);
export const taskPriority = pgEnum("task_priority", ["low", "normal", "high"]);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: taskStatus("status").notNull().default("open"),
    priority: taskPriority("priority").notNull().default("normal"),
    dueDate: date("due_date"),
    assignee: text("assignee").notNull().default(""),
    customValues: jsonb("custom_values")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tasks_tenant_idx").on(t.tenantId)],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
