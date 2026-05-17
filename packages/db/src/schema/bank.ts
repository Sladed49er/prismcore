/**
 * Bank reconciliation schema — a record of each bank-statement reconciliation.
 * Tenant-scoped, RLS-isolated. (Plaid bank-feed auto-matching is a follow-on.)
 */
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

export const reconciliationStatus = pgEnum("reconciliation_status", [
  "in_progress",
  "completed",
]);

export const bankReconciliations = pgTable(
  "bank_reconciliations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    accountName: text("account_name").notNull(),
    statementDate: date("statement_date"),
    statementBalanceCents: integer("statement_balance_cents")
      .notNull()
      .default(0),
    reconciledBalanceCents: integer("reconciled_balance_cents")
      .notNull()
      .default(0),
    status: reconciliationStatus("status").notNull().default("in_progress"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bank_reconciliations_tenant_idx").on(t.tenantId)],
);

export type BankReconciliation = typeof bankReconciliations.$inferSelect;
export type NewBankReconciliation = typeof bankReconciliations.$inferInsert;
