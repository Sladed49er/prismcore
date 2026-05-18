/**
 * Carrier appetite schema — per-carrier underwriting appetite rules keyed by
 * NAICS industry-code prefix, ported from PrismAMS.
 *
 * A rule says "for risks whose NAICS code starts with `naicsPrefix`, this
 * carrier's appetite is X". Matching is most-specific-prefix-wins: a rule on
 * "7225" beats a rule on "72" for a restaurant. Tenant-scoped, RLS-isolated.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { carriers } from "./carriers";

export const carrierAppetiteRules = pgTable(
  "carrier_appetite_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id, { onDelete: "cascade" }),
    /** NAICS industry-code prefix this rule covers, e.g. "722" (food service). */
    naicsPrefix: text("naics_prefix").notNull(),
    /** "preferred" · "neutral" · "restricted" · "declined". */
    appetite: text("appetite").notNull().default("neutral"),
    /** Optional line-of-business filter — empty means the rule applies to all. */
    lineOfBusiness: text("line_of_business").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("carrier_appetite_tenant_idx").on(t.tenantId),
    index("carrier_appetite_carrier_idx").on(t.carrierId),
  ],
);

export type CarrierAppetiteRule = typeof carrierAppetiteRules.$inferSelect;
export type NewCarrierAppetiteRule = typeof carrierAppetiteRules.$inferInsert;
