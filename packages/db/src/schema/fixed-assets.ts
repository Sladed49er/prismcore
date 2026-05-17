/**
 * Fixed assets schema — depreciable assets. Tenant-scoped, RLS-isolated.
 * Accumulated depreciation and book value are computed in the service layer
 * from acquisition cost, salvage value, useful life, and elapsed time.
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

export const depreciationMethod = pgEnum("depreciation_method", [
  "straight_line",
  "declining_balance",
]);

export const fixedAssets = pgTable(
  "fixed_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull().default(""),
    acquisitionCostCents: integer("acquisition_cost_cents")
      .notNull()
      .default(0),
    salvageValueCents: integer("salvage_value_cents").notNull().default(0),
    usefulLifeYears: integer("useful_life_years").notNull().default(5),
    method: depreciationMethod("method").notNull().default("straight_line"),
    acquiredDate: date("acquired_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("fixed_assets_tenant_idx").on(t.tenantId)],
);

export type FixedAsset = typeof fixedAssets.$inferSelect;
export type NewFixedAsset = typeof fixedAssets.$inferInsert;
