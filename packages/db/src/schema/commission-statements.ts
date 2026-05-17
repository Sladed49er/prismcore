/**
 * Carrier commission statements schema — statements received from carriers.
 * Tenant-scoped. Variance = reported − expected.
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

export const commissionStatementStatus = pgEnum(
  "commission_statement_status",
  ["received", "reconciled", "disputed"],
);

export const commissionStatements = pgTable(
  "commission_statements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    carrierName: text("carrier_name").notNull(),
    statementDate: date("statement_date"),
    periodLabel: text("period_label").notNull().default(""),
    expectedCents: integer("expected_cents").notNull().default(0),
    reportedCents: integer("reported_cents").notNull().default(0),
    status: commissionStatementStatus("status")
      .notNull()
      .default("received"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("commission_statements_tenant_idx").on(t.tenantId)],
);

export type CommissionStatement = typeof commissionStatements.$inferSelect;
export type NewCommissionStatement =
  typeof commissionStatements.$inferInsert;
