/**
 * Households schema — wealth-management households: the family or entity unit
 * a financial practice advises. Tenant-scoped.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  bigint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const householdType = pgEnum("household_type", [
  "family",
  "individual",
  "trust",
  "business",
]);

export const householdRiskProfile = pgEnum("household_risk_profile", [
  "conservative",
  "moderate",
  "aggressive",
]);

export const householdStatus = pgEnum("household_status", [
  "prospect",
  "active",
  "inactive",
]);

export const households = pgTable(
  "households",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    primaryContactName: text("primary_contact_name").notNull().default(""),
    advisorName: text("advisor_name").notNull().default(""),
    type: householdType("type").notNull().default("family"),
    /** Assets under management, in cents. */
    aumCents: bigint("aum_cents", { mode: "number" }).notNull().default(0),
    riskProfile: householdRiskProfile("risk_profile")
      .notNull()
      .default("moderate"),
    status: householdStatus("status").notNull().default("prospect"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("households_tenant_idx").on(t.tenantId)],
);

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
