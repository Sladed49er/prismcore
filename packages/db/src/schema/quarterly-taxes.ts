/** Quarterly tax schema — estimated tax payment schedule. Tenant-scoped. */
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

export const quarterlyTaxStatus = pgEnum("quarterly_tax_status", [
  "scheduled",
  "paid",
]);

export const quarterlyTaxPayments = pgTable(
  "quarterly_tax_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    taxType: text("tax_type").notNull(),
    year: text("year").notNull().default(""),
    quarter: text("quarter").notNull().default("Q1"),
    estimatedCents: integer("estimated_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    dueDate: date("due_date"),
    status: quarterlyTaxStatus("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("quarterly_tax_payments_tenant_idx").on(t.tenantId)],
);

export type QuarterlyTaxPayment = typeof quarterlyTaxPayments.$inferSelect;
export type NewQuarterlyTaxPayment =
  typeof quarterlyTaxPayments.$inferInsert;
