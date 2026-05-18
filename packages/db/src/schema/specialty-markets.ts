/**
 * Specialty markets schema — an agency's repository of niche carriers, MGAs,
 * wholesalers, and programs for placing hard-to-write risks. Tenant-scoped.
 *
 * The AI market-match feature reads this repository to recommend a fit for a
 * described risk; it does not write here.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const specialtyMarketType = pgEnum("specialty_market_type", [
  "mga",
  "wholesaler",
  "surplus_carrier",
  "program",
  "other",
]);

export const specialtyMarkets = pgTable(
  "specialty_markets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    marketType: specialtyMarketType("market_type").notNull().default("mga"),
    /** What the market writes — its appetite, in prose. */
    appetite: text("appetite").notNull().default(""),
    /** Lines of business, comma-separated, e.g. "Cyber, Professional, E&O". */
    linesOfBusiness: text("lines_of_business").notNull().default(""),
    /** States the market is admitted/active in, comma-separated. */
    states: text("states").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),
    website: text("website").notNull().default(""),
    notes: text("notes").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("specialty_markets_tenant_idx").on(t.tenantId)],
);

export type SpecialtyMarket = typeof specialtyMarkets.$inferSelect;
export type NewSpecialtyMarket = typeof specialtyMarkets.$inferInsert;
