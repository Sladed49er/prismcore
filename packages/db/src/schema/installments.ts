/** Premium installments schema — a policy's billing schedule. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { policies } from "./policies";

export const installmentStatus = pgEnum("premium_installment_status", [
  "scheduled",
  "paid",
]);

export const premiumInstallments = pgTable(
  "premium_installments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    installmentNumber: integer("installment_number").notNull().default(1),
    dueDate: date("due_date"),
    amountCents: integer("amount_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    status: installmentStatus("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("premium_installments_tenant_idx").on(t.tenantId),
    index("premium_installments_policy_idx").on(t.policyId),
  ],
);

export type PremiumInstallment = typeof premiumInstallments.$inferSelect;
export type NewPremiumInstallment = typeof premiumInstallments.$inferInsert;
