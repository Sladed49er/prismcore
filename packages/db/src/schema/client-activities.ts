/** Client activities schema — the CRM interaction log. Tenant-scoped. */
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
import { clients } from "./clients";

export const clientActivityType = pgEnum("client_activity_type", [
  "call",
  "email",
  "meeting",
  "note",
  "task",
]);

export const clientActivities = pgTable(
  "client_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    activityType: clientActivityType("activity_type")
      .notNull()
      .default("note"),
    subject: text("subject").notNull(),
    detail: text("detail").notNull().default(""),
    activityDate: date("activity_date"),
    author: text("author").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("client_activities_tenant_idx").on(t.tenantId),
    index("client_activities_client_idx").on(t.clientId),
  ],
);

export type ClientActivity = typeof clientActivities.$inferSelect;
export type NewClientActivity = typeof clientActivities.$inferInsert;
