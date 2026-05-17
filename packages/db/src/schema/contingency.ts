/**
 * Contingency income schema — carrier contingency, profit-share, and bonus
 * income. Tenant-scoped. Tracked projected vs. received by carrier and year.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const contingencyIncomeType = pgEnum("contingency_income_type", [
  "contingency",
  "profit_share",
  "bonus",
  "growth",
]);

export const contingencyStatus = pgEnum("contingency_status", [
  "projected",
  "received",
  "closed",
]);

export const contingencyIncome = pgTable(
  "contingency_income",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    carrierName: text("carrier_name").notNull(),
    year: text("year").notNull().default(""),
    incomeType: contingencyIncomeType("income_type")
      .notNull()
      .default("contingency"),
    expectedCents: integer("expected_cents").notNull().default(0),
    receivedCents: integer("received_cents").notNull().default(0),
    status: contingencyStatus("status").notNull().default("projected"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("contingency_income_tenant_idx").on(t.tenantId)],
);

export type ContingencyIncome = typeof contingencyIncome.$inferSelect;
export type NewContingencyIncome = typeof contingencyIncome.$inferInsert;
