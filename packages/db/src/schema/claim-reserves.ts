/**
 * Claim reserves schema — reserve-change ledger on a claim. Tenant-scoped.
 * A claim's reserve by type is the sum of its entries' change amounts.
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
import { claims } from "./claims";

export const reserveType = pgEnum("claim_reserve_type", [
  "indemnity",
  "expense",
  "legal",
  "medical",
]);

export const claimReserveEntries = pgTable(
  "claim_reserve_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    entryDate: date("entry_date"),
    reserveType: reserveType("reserve_type").notNull().default("indemnity"),
    /** Reserve delta in cents — may be negative to release reserve. */
    changeCents: integer("change_cents").notNull().default(0),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("claim_reserve_entries_tenant_idx").on(t.tenantId),
    index("claim_reserve_entries_claim_idx").on(t.claimId),
  ],
);

export type ClaimReserveEntry = typeof claimReserveEntries.$inferSelect;
export type NewClaimReserveEntry = typeof claimReserveEntries.$inferInsert;
