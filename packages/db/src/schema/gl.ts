/**
 * General Ledger schema — the core of the Accounting module.
 *
 *  - `chart_of_accounts` — the GL account master.
 *  - `journal_entries` + `journal_entry_lines` — double-entry postings; every
 *    entry's debit lines must equal its credit lines (enforced in the service).
 *
 * Tenant-scoped, RLS-isolated.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const glAccountType = pgEnum("gl_account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const journalEntryStatus = pgEnum("journal_entry_status", [
  "draft",
  "posted",
]);

export const chartOfAccounts = pgTable(
  "chart_of_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    accountNumber: text("account_number").notNull(),
    name: text("name").notNull(),
    type: glAccountType("type").notNull(),
    subtype: text("subtype").notNull().default(""),
    description: text("description").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("chart_of_accounts_tenant_idx").on(t.tenantId)],
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entryNumber: text("entry_number").notNull(),
    entryDate: date("entry_date"),
    memo: text("memo").notNull().default(""),
    source: text("source").notNull().default("manual"),
    status: journalEntryStatus("status").notNull().default("posted"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("journal_entries_tenant_idx").on(t.tenantId)],
);

export const journalEntryLines = pgTable(
  "journal_entry_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: "restrict" }),
    debitCents: integer("debit_cents").notNull().default(0),
    creditCents: integer("credit_cents").notNull().default(0),
    lineMemo: text("line_memo").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("journal_entry_lines_tenant_idx").on(t.tenantId),
    index("journal_entry_lines_entry_idx").on(t.journalEntryId),
  ],
);

export type ChartAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartAccount = typeof chartOfAccounts.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
