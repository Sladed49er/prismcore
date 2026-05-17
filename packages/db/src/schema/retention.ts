/** Retention records schema — the outcome of each renewal. Tenant-scoped. */
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

export const retentionOutcome = pgEnum("retention_outcome", [
  "renewed",
  "rewritten",
  "lost",
  "non_renewed",
]);

export const retentionReason = pgEnum("retention_reason", [
  "price",
  "coverage",
  "service",
  "carrier_exit",
  "claims",
  "other",
]);

export const retentionRecords = pgTable(
  "retention_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    renewalId: uuid("renewal_id")
      .notNull()
      .references(() => renewals.id, { onDelete: "cascade" }),
    outcome: retentionOutcome("outcome").notNull().default("renewed"),
    reasonCode: retentionReason("reason_code").notNull().default("other"),
    priorPremiumCents: integer("prior_premium_cents").notNull().default(0),
    newPremiumCents: integer("new_premium_cents").notNull().default(0),
    recordedDate: date("recorded_date"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("retention_records_tenant_idx").on(t.tenantId),
    index("retention_records_renewal_idx").on(t.renewalId),
  ],
);

export type RetentionRecord = typeof retentionRecords.$inferSelect;
export type NewRetentionRecord = typeof retentionRecords.$inferInsert;
