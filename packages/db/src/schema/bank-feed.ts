/**
 * Bank-feed schema — bank accounts linked through Stripe Financial Connections
 * and the transactions synced from them. Tenant-scoped.
 *
 * This is the live-data side of Accounting: linked accounts carry a balance,
 * and their transactions feed reconciliation and budgeting. The manual
 * statement-reconciliation records live separately in `bank.ts`.
 */
import {
  pgTable,
  uuid,
  text,
  bigint,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const bankFeedAccounts = pgTable(
  "bank_feed_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Stripe Financial Connections account id (`fca_...`). */
    fcAccountId: text("fc_account_id").notNull().unique(),
    institutionName: text("institution_name").notNull().default(""),
    displayName: text("display_name").notNull().default(""),
    last4: text("last4").notNull().default(""),
    /** Financial Connections category — cash, credit, investment, other. */
    category: text("category").notNull().default(""),
    /** Subcategory — checking, savings, credit_card, etc. */
    subcategory: text("subcategory").notNull().default(""),
    /** active · inactive · disconnected. */
    status: text("status").notNull().default("active"),
    balanceCents: bigint("balance_cents", { mode: "number" })
      .notNull()
      .default(0),
    balanceCurrency: text("balance_currency").notNull().default("usd"),
    balanceRefreshedAt: timestamp("balance_refreshed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bank_feed_accounts_tenant_idx").on(t.tenantId)],
);

export const bankFeedTransactions = pgTable(
  "bank_feed_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => bankFeedAccounts.id, { onDelete: "cascade" }),
    /** Stripe Financial Connections transaction id (`fctxn_...`). */
    fcTransactionId: text("fc_transaction_id").notNull().unique(),
    /** Signed minor units — negative is money out. */
    amountCents: bigint("amount_cents", { mode: "number" })
      .notNull()
      .default(0),
    currency: text("currency").notNull().default("usd"),
    description: text("description").notNull().default(""),
    /** pending · posted · void. */
    status: text("status").notNull().default("posted"),
    transactedAt: timestamp("transacted_at", { withTimezone: true }),
    /** Optional budgeting category, set by the agency. */
    category: text("category").notNull().default(""),
    /** Whether this transaction has been reconciled against the books. */
    reconciled: boolean("reconciled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bank_feed_transactions_tenant_idx").on(t.tenantId),
    index("bank_feed_transactions_account_idx").on(t.accountId),
  ],
);

export type BankFeedAccount = typeof bankFeedAccounts.$inferSelect;
export type NewBankFeedAccount = typeof bankFeedAccounts.$inferInsert;
export type BankFeedTransaction = typeof bankFeedTransactions.$inferSelect;
export type NewBankFeedTransaction = typeof bankFeedTransactions.$inferInsert;
