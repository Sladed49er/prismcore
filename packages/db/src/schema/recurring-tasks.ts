/** Recurring tasks schema — task templates that recur on a schedule. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { taskPriority } from "./tasks";

export const recurrenceFrequency = pgEnum("recurrence_frequency", [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annually",
]);

export const recurringTaskStatus = pgEnum("recurring_task_status", [
  "active",
  "paused",
]);

export const recurringTasks = pgTable(
  "recurring_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    assignee: text("assignee").notNull().default(""),
    priority: taskPriority("priority").notNull().default("normal"),
    frequency: recurrenceFrequency("frequency").notNull().default("monthly"),
    nextDueDate: date("next_due_date"),
    status: recurringTaskStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("recurring_tasks_tenant_idx").on(t.tenantId)],
);

export type RecurringTask = typeof recurringTasks.$inferSelect;
export type NewRecurringTask = typeof recurringTasks.$inferInsert;
