/** Commissions schema — commission records tracked against a policy. */
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

export const commissionStatus = pgEnum("commission_status", [
  "pending",
  "received",
  "reconciled",
]);

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull().default(0),
    ratePercent: text("rate_percent").notNull().default(""),
    status: commissionStatus("status").notNull().default("pending"),
    receivedDate: date("received_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("commissions_tenant_idx").on(t.tenantId),
    index("commissions_policy_idx").on(t.policyId),
  ],
);

export type Commission = typeof commissions.$inferSelect;
export type NewCommission = typeof commissions.$inferInsert;
