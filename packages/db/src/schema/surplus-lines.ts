/**
 * Surplus lines tax schema — per-state surplus-lines tax tracking. Tenant-scoped.
 * Total due = tax + stamping fee + filing fee.
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

export const surplusLinesStatus = pgEnum("surplus_lines_status", [
  "pending",
  "filed",
  "paid",
]);

export const surplusLinesTax = pgTable(
  "surplus_lines_tax",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyReference: text("policy_reference").notNull(),
    state: text("state").notNull().default(""),
    premiumCents: integer("premium_cents").notNull().default(0),
    taxRatePercent: text("tax_rate_percent").notNull().default(""),
    taxCents: integer("tax_cents").notNull().default(0),
    stampingFeeCents: integer("stamping_fee_cents").notNull().default(0),
    filingFeeCents: integer("filing_fee_cents").notNull().default(0),
    dueDate: date("due_date"),
    status: surplusLinesStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("surplus_lines_tax_tenant_idx").on(t.tenantId)],
);

export type SurplusLinesTax = typeof surplusLinesTax.$inferSelect;
export type NewSurplusLinesTax = typeof surplusLinesTax.$inferInsert;
