/**
 * Renewal offers schema — the renewal terms presented to the insured.
 * Tenant-scoped. Premium change = premium − prior premium.
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
import { renewals } from "./renewals";

export const renewalOfferStatus = pgEnum("renewal_offer_status", [
  "draft",
  "presented",
  "accepted",
  "declined",
]);

export const renewalOffers = pgTable(
  "renewal_offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    renewalId: uuid("renewal_id")
      .notNull()
      .references(() => renewals.id, { onDelete: "cascade" }),
    carrierName: text("carrier_name").notNull().default(""),
    offerDate: date("offer_date"),
    premiumCents: integer("premium_cents").notNull().default(0),
    priorPremiumCents: integer("prior_premium_cents").notNull().default(0),
    termSummary: text("term_summary").notNull().default(""),
    expiresDate: date("expires_date"),
    status: renewalOfferStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("renewal_offers_tenant_idx").on(t.tenantId),
    index("renewal_offers_renewal_idx").on(t.renewalId),
  ],
);

export type RenewalOffer = typeof renewalOffers.$inferSelect;
export type NewRenewalOffer = typeof renewalOffers.$inferInsert;
