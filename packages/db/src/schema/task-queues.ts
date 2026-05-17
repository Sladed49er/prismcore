/** Task queues schema — the work queues tasks are grouped into. Tenant-scoped. */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const taskQueues = pgTable(
  "task_queues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("task_queues_tenant_idx").on(t.tenantId)],
);

export type TaskQueue = typeof taskQueues.$inferSelect;
export type NewTaskQueue = typeof taskQueues.$inferInsert;
