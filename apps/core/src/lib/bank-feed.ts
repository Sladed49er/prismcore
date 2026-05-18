import type Stripe from "stripe";
import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  bankFeedAccounts,
  bankFeedTransactions,
  type BankFeedAccount,
  type BankFeedTransaction,
} from "@prismcore/db";
import { stripe } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/billing";

/**
 * Bank-feed data layer — Stripe Financial Connections.
 *
 * Linking happens in the browser through Stripe.js (the agency authenticates
 * with their own bank on Stripe's hosted flow — no credentials ever reach
 * Prism Core). This module creates the link session, persists the accounts
 * Stripe returns, and syncs balances and transactions on demand. Every write
 * is RLS-scoped through `withTenantContext`.
 */

export type { BankFeedAccount, BankFeedTransaction };

/* ── Linking ──────────────────────────────────────────────────────── */

/**
 * Start a Financial Connections link session. Returns the client secret the
 * browser hands to `stripe.collectFinancialConnectionsAccounts`.
 */
export async function createBankLinkSession(
  tenantId: string,
  tenantName: string,
): Promise<string> {
  const customer = await ensureStripeCustomer(tenantId, tenantName);
  const session = await stripe().financialConnections.sessions.create({
    account_holder: { type: "customer", customer },
    permissions: ["balances", "transactions"],
    filters: { countries: ["US"] },
  });
  if (!session.client_secret) {
    throw new Error("Stripe did not return a link session secret");
  }
  return session.client_secret;
}

/** First currency entry of a Financial Connections balance hash. */
function readBalance(account: Stripe.FinancialConnections.Account): {
  cents: number;
  currency: string;
  asOf: Date | null;
} {
  const balance = account.balance;
  if (!balance) return { cents: 0, currency: "usd", asOf: null };
  const current = (balance.current ?? {}) as Record<string, number>;
  const [currency, cents] = Object.entries(current)[0] ?? ["usd", 0];
  return {
    cents: cents ?? 0,
    currency,
    asOf: balance.as_of ? new Date(balance.as_of * 1000) : null,
  };
}

/** Map a Stripe FC account onto our row shape. */
function accountValues(
  tenantId: string,
  account: Stripe.FinancialConnections.Account,
) {
  const balance = readBalance(account);
  return {
    tenantId,
    fcAccountId: account.id,
    institutionName: account.institution_name ?? "",
    displayName: account.display_name ?? "",
    last4: account.last4 ?? "",
    category: account.category ?? "",
    subcategory: account.subcategory ?? "",
    status: account.status ?? "active",
    balanceCents: balance.cents,
    balanceCurrency: balance.currency,
    balanceRefreshedAt: balance.asOf,
    updatedAt: new Date(),
  };
}

/**
 * Persist the accounts the browser linked. Each is retrieved from Stripe,
 * subscribed for transaction refreshes, and an initial refresh is kicked off.
 */
export async function saveLinkedAccounts(
  tenantId: string,
  fcAccountIds: string[],
): Promise<number> {
  let saved = 0;
  for (const fcId of fcAccountIds) {
    if (typeof fcId !== "string" || !fcId.startsWith("fca_")) continue;
    let account: Stripe.FinancialConnections.Account;
    try {
      account = await stripe().financialConnections.accounts.retrieve(fcId);
    } catch {
      continue; // skip an id we can't resolve
    }

    await withTenantContext(tenantId, async (tx) => {
      const values = accountValues(tenantId, account);
      await tx
        .insert(bankFeedAccounts)
        .values(values)
        .onConflictDoUpdate({
          target: bankFeedAccounts.fcAccountId,
          set: values,
        });
    });
    saved++;

    // Subscribe + refresh so transactions and balance start flowing. Both are
    // best-effort — a failure here must not lose the linked account.
    try {
      await stripe().financialConnections.accounts.subscribe(fcId, {
        features: ["transactions"],
      });
    } catch {
      /* already subscribed, or unsupported for this account — ignore */
    }
    try {
      await stripe().financialConnections.accounts.refresh(fcId, {
        features: ["balance", "transactions"],
      });
    } catch {
      /* refresh kickoff failed — the manual Sync will retry */
    }
  }
  return saved;
}

/* ── Reads ────────────────────────────────────────────────────────── */

export async function listBankFeedAccounts(
  tenantId: string,
): Promise<BankFeedAccount[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(bankFeedAccounts)
      .where(eq(bankFeedAccounts.tenantId, tenantId))
      .orderBy(desc(bankFeedAccounts.createdAt)),
  );
}

export async function listBankFeedTransactions(
  tenantId: string,
): Promise<BankFeedTransaction[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(bankFeedTransactions)
      .where(eq(bankFeedTransactions.tenantId, tenantId))
      .orderBy(desc(bankFeedTransactions.transactedAt)),
  );
}

/* ── Sync ─────────────────────────────────────────────────────────── */

/** Unix-seconds timestamp on a FC transaction, tolerant of field naming. */
function txnTimestamp(
  txn: Stripe.FinancialConnections.Transaction,
): Date | null {
  const t = txn.transacted_at;
  return typeof t === "number" ? new Date(t * 1000) : null;
}

/**
 * Pull the current balance and latest transactions for one linked account
 * from Stripe and upsert them. Returns the number of transactions seen.
 */
export async function syncBankFeedAccount(
  tenantId: string,
  accountId: string,
): Promise<{ ok: boolean; transactions: number; message: string }> {
  const [row] = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(bankFeedAccounts)
      .where(
        and(
          eq(bankFeedAccounts.tenantId, tenantId),
          eq(bankFeedAccounts.id, accountId),
        ),
      ),
  );
  if (!row) return { ok: false, transactions: 0, message: "Account not found" };

  // Refresh + re-read the account for an up-to-date balance and status.
  try {
    await stripe().financialConnections.accounts.refresh(row.fcAccountId, {
      features: ["balance", "transactions"],
    });
  } catch {
    /* a refresh may already be in flight — continue with what's available */
  }

  let account: Stripe.FinancialConnections.Account;
  try {
    account = await stripe().financialConnections.accounts.retrieve(
      row.fcAccountId,
    );
  } catch (error) {
    return {
      ok: false,
      transactions: 0,
      message:
        error instanceof Error ? error.message : "Could not reach Stripe",
    };
  }

  const transactions = await stripe().financialConnections.transactions.list({
    account: row.fcAccountId,
    limit: 100,
  });

  await withTenantContext(tenantId, async (tx) => {
    const values = accountValues(tenantId, account);
    await tx
      .update(bankFeedAccounts)
      .set(values)
      .where(eq(bankFeedAccounts.id, accountId));

    for (const txn of transactions.data) {
      const record = {
        tenantId,
        accountId,
        fcTransactionId: txn.id,
        amountCents: txn.amount ?? 0,
        currency: txn.currency ?? "usd",
        description: txn.description ?? "",
        status: txn.status ?? "posted",
        transactedAt: txnTimestamp(txn),
      };
      await tx
        .insert(bankFeedTransactions)
        .values(record)
        .onConflictDoUpdate({
          target: bankFeedTransactions.fcTransactionId,
          // Keep the agency's category/reconciled flags; refresh the rest.
          set: {
            amountCents: record.amountCents,
            description: record.description,
            status: record.status,
            transactedAt: record.transactedAt,
          },
        });
    }
  });

  return {
    ok: true,
    transactions: transactions.data.length,
    message: `Synced ${transactions.data.length} transaction${
      transactions.data.length === 1 ? "" : "s"
    }.`,
  };
}

/** Disconnect an account at Stripe and drop it (transactions cascade). */
export async function disconnectBankFeedAccount(
  tenantId: string,
  accountId: string,
): Promise<void> {
  const [row] = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(bankFeedAccounts)
      .where(
        and(
          eq(bankFeedAccounts.tenantId, tenantId),
          eq(bankFeedAccounts.id, accountId),
        ),
      ),
  );
  if (!row) return;
  try {
    await stripe().financialConnections.accounts.disconnect(row.fcAccountId);
  } catch {
    /* already disconnected at Stripe — still drop our copy */
  }
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(bankFeedAccounts)
      .where(eq(bankFeedAccounts.id, accountId));
  });
}

/* ── Transaction edits ────────────────────────────────────────────── */

export async function setTransactionCategory(input: {
  tenantId: string;
  id: string;
  category: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(bankFeedTransactions)
      .set({ category: input.category })
      .where(eq(bankFeedTransactions.id, input.id));
  });
}

export async function setTransactionReconciled(input: {
  tenantId: string;
  id: string;
  reconciled: boolean;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(bankFeedTransactions)
      .set({ reconciled: input.reconciled })
      .where(eq(bankFeedTransactions.id, input.id));
  });
}
