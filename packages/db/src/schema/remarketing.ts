/**
 * Remarketing quotes schema — carrier quotes gathered while shopping a renewal.
 * Tenant-scoped. Multiple quotes per renewal form the remarketing worksheet.
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
import { renewals } from "./renewals";

export const remarketingQuoteStatus = pgEnum("remarketing_quote_status", [
  "requested",
  "received",
  "declined",
  "selected",
]);

export const remarketingQuotes = pgTable(
  "remarketing_quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    renewalId: uuid("renewal_id")
      .notNull()
      .references(() => renewals.id, { onDelete: "cascade" }),
    carrierName: text("carrier_name").notNull(),
    quotedPremiumCents: integer("quoted_premium_cents").notNull().default(0),
    coverageSummary: text("coverage_summary").notNull().default(""),
    status: remarketingQuoteStatus("status").notNull().default("requested"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("remarketing_quotes_tenant_idx").on(t.tenantId),
    index("remarketing_quotes_renewal_idx").on(t.renewalId),
  ],
);

export type RemarketingQuote = typeof remarketingQuotes.$inferSelect;
export type NewRemarketingQuote = typeof remarketingQuotes.$inferInsert;
