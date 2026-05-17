/**
 * Trust accounting schema — the fiduciary premium trust ledger. Premiums received
 * from insureds are held in trust until remitted to carriers; the ledger keeps a
 * running balance. Tenant-scoped, RLS-isolated.
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

export const trustEntryType = pgEnum("trust_entry_type", [
  "premium_received",
  "remitted",
  "return",
  "fee",
]);

export const trustLedgerEntries = pgTable(
  "trust_ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entryType: trustEntryType("entry_type").notNull(),
    amountCents: integer("amount_cents").notNull().default(0),
    description: text("description").notNull().default(""),
    /** Insured or carrier the entry relates to. */
    party: text("party").notNull().default(""),
    /** State code — trust compliance is regulated per state. */
    state: text("state").notNull().default(""),
    entryDate: date("entry_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("trust_ledger_entries_tenant_idx").on(t.tenantId)],
);

export type TrustLedgerEntry = typeof trustLedgerEntries.$inferSelect;
export type NewTrustLedgerEntry = typeof trustLedgerEntries.$inferInsert;
