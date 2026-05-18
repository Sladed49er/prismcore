"use client";

import { useState, useTransition } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  startBankLink,
  linkAccounts,
  syncAccount,
  removeAccount,
  categorizeTransaction,
  toggleReconciled,
} from "@/app/(shell)/m/accounting/bank-feeds/actions";

export interface BankFeedAccountDTO {
  id: string;
  institutionName: string;
  displayName: string;
  last4: string;
  subcategory: string;
  status: string;
  balanceCents: number;
  balanceCurrency: string;
  balanceRefreshedAt: string | null;
}

export interface BankFeedTransactionDTO {
  id: string;
  accountId: string;
  amountCents: number;
  currency: string;
  description: string;
  status: string;
  transactedAt: string | null;
  category: string;
  reconciled: boolean;
}

function money(cents: number, currency = "usd"): string {
  const sign = cents < 0 ? "-" : "";
  const v = Math.abs(cents) / 100;
  return `${sign}${currency === "usd" ? "$" : ""}${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function BankFeedPanel({
  accounts,
  transactions,
  publishableKey,
}: {
  accounts: BankFeedAccountDTO[];
  transactions: BankFeedTransactionDTO[];
  publishableKey: string;
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function linkBank(): void {
    setNotice(null);
    setError(null);
    if (!publishableKey) {
      setError("Stripe is not configured for this workspace.");
      return;
    }
    startTransition(async () => {
      try {
        const clientSecret = await startBankLink();
        const stripe = await loadStripe(publishableKey);
        if (!stripe) {
          setError("Stripe.js failed to load.");
          return;
        }
        const result = await stripe.collectFinancialConnectionsAccounts({
          clientSecret,
        });
        if (result.error) {
          setError(result.error.message ?? "Bank linking was cancelled.");
          return;
        }
        const linked =
          result.financialConnectionsSession?.accounts ?? [];
        if (linked.length === 0) {
          setNotice("No accounts were linked.");
          return;
        }
        const { saved } = await linkAccounts(linked.map((a) => a.id));
        setNotice(
          `Linked ${saved} account${saved === 1 ? "" : "s"}. Use Sync to pull balances and transactions.`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bank linking failed.");
      }
    });
  }

  function sync(accountId: string): void {
    setNotice(null);
    setError(null);
    startTransition(async () => {
      const result = await syncAccount(accountId);
      if (result.ok) setNotice(result.message);
      else setError(result.message);
    });
  }

  function disconnect(accountId: string): void {
    if (!confirm("Disconnect this bank account? Its transactions are removed."))
      return;
    startTransition(async () => {
      await removeAccount(accountId);
    });
  }

  function saveCategory(id: string, current: string, next: string): void {
    if (next.trim() === current) return;
    startTransition(async () => {
      await categorizeTransaction({ id, category: next });
    });
  }

  function flipReconciled(id: string, reconciled: boolean): void {
    startTransition(async () => {
      await toggleReconciled({ id, reconciled });
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {accounts.length} linked account{accounts.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={linkBank}
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Working…" : "+ Link a bank account"}
        </button>
      </div>

      {notice ? (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {/* Linked accounts */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {accounts.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500 sm:col-span-2">
            No bank accounts linked yet. Link one to pull balances and
            transactions automatically.
          </p>
        ) : (
          accounts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {a.displayName || a.institutionName || "Bank account"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[a.institutionName, a.subcategory, a.last4 && `••${a.last4}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    a.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {a.status}
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {money(a.balanceCents, a.balanceCurrency)}
              </p>
              <p className="text-xs text-gray-400">
                {a.balanceRefreshedAt
                  ? `Balance as of ${new Date(a.balanceRefreshedAt).toLocaleString()}`
                  : "Balance not yet refreshed"}
              </p>
              <div className="mt-3 flex gap-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => sync(a.id)}
                  disabled={pending}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  Sync
                </button>
                <button
                  type="button"
                  onClick={() => disconnect(a.id)}
                  disabled={pending}
                  className="text-rose-600 hover:text-rose-800"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transactions */}
      {transactions.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Reconciled
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-gray-500">
                      {t.transactedAt
                        ? new Date(t.transactedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {t.description || "—"}
                      {t.status === "pending" ? (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          pending
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={t.category}
                        onBlur={(e) =>
                          saveCategory(t.id, t.category, e.target.value)
                        }
                        placeholder="Uncategorized"
                        className="w-32 rounded border border-transparent px-2 py-1 text-sm outline-none hover:border-gray-200 focus:border-indigo-500"
                      />
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        t.amountCents < 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {money(t.amountCents, t.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={t.reconciled}
                        disabled={pending}
                        onChange={(e) =>
                          flipReconciled(t.id, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
