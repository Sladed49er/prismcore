/** Service activities schema — the policy servicing log. Tenant-scoped. */
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
import { policies } from "./policies";

export const serviceActivityType = pgEnum("service_activity_type", [
  "inquiry",
  "change_request",
  "coverage_review",
  "claim_follow_up",
  "document_request",
  "other",
]);

export const serviceActivityStatus = pgEnum("service_activity_status", [
  "open",
  "in_progress",
  "completed",
]);

export const serviceActivities = pgTable(
  "service_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    activityType: serviceActivityType("activity_type")
      .notNull()
      .default("inquiry"),
    subject: text("subject").notNull(),
    detail: text("detail").notNull().default(""),
    assignedTo: text("assigned_to").notNull().default(""),
    dueDate: date("due_date"),
    status: serviceActivityStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("service_activities_tenant_idx").on(t.tenantId),
    index("service_activities_policy_idx").on(t.policyId),
  ],
);

export type ServiceActivity = typeof serviceActivities.$inferSelect;
export type NewServiceActivity = typeof serviceActivities.$inferInsert;
