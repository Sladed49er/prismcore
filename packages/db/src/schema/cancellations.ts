/** Policy cancellations schema — cancellation requests and tracking. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { policies } from "./policies";

export const cancellationType = pgEnum("cancellation_type", [
  "flat",
  "pro_rata",
  "short_rate",
]);

export const cancellationStatus = pgEnum("cancellation_status", [
  "requested",
  "processed",
  "reinstated",
]);

export const policyCancellations = pgTable(
  "policy_cancellations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    requestDate: date("request_date"),
    effectiveDate: date("effective_date"),
    reason: text("reason").notNull().default(""),
    cancellationType: cancellationType("cancellation_type")
      .notNull()
      .default("pro_rata"),
    returnPremiumCents: integer("return_premium_cents").notNull().default(0),
    status: cancellationStatus("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("policy_cancellations_tenant_idx").on(t.tenantId),
    index("policy_cancellations_policy_idx").on(t.policyId),
  ],
);

export type PolicyCancellation = typeof policyCancellations.$inferSelect;
export type NewPolicyCancellation = typeof policyCancellations.$inferInsert;
