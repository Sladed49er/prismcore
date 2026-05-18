import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import {
  listBankFeedAccounts,
  listBankFeedTransactions,
} from "@/lib/bank-feed";
import {
  BankFeedPanel,
  type BankFeedAccountDTO,
  type BankFeedTransactionDTO,
} from "@/components/bank-feed-panel";

/**
 * Bank Feeds — bank accounts linked through Stripe Financial Connections.
 * Balances and transactions sync from the bank and flow into reconciliation
 * and budgeting.
 */
export default async function BankFeedsPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const [accountRows, transactionRows] = await Promise.all([
    listBankFeedAccounts(config.id),
    listBankFeedTransactions(config.id),
  ]);

  const accounts: BankFeedAccountDTO[] = accountRows.map((a) => ({
    id: a.id,
    institutionName: a.institutionName,
    displayName: a.displayName,
    last4: a.last4,
    subcategory: a.subcategory,
    status: a.status,
    balanceCents: a.balanceCents,
    balanceCurrency: a.balanceCurrency,
    balanceRefreshedAt: a.balanceRefreshedAt
      ? a.balanceRefreshedAt.toISOString()
      : null,
  }));

  const transactions: BankFeedTransactionDTO[] = transactionRows.map((t) => ({
    id: t.id,
    accountId: t.accountId,
    amountCents: t.amountCents,
    currency: t.currency,
    description: t.description,
    status: t.status,
    transactedAt: t.transactedAt ? t.transactedAt.toISOString() : null,
    category: t.category,
    reconciled: t.reconciled,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Bank Feeds</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Link a bank account through Stripe&rsquo;s secure connection — Prism
        Core never sees your banking credentials. Synced balances and
        transactions feed reconciliation and budgeting.
      </p>
      <BankFeedPanel
        accounts={accounts}
        transactions={transactions}
        publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
      />
    </div>
  );
}
