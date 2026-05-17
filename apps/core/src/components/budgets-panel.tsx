"use client";

import { useState, useTransition } from "react";
import { newBudget, addLine } from "@/app/(shell)/m/accounting/budgets/actions";

export interface BudgetDTO {
  id: string;
  name: string;
  fiscalYear: string;
  status: string;
  totalCents: number;
  lineCount: number;
}

export interface BudgetLineDTO {
  id: string;
  budgetId: string;
  accountName: string;
  annualAmountCents: number;
}

export interface AccountOption {
  id: string;
  label: string;
}

const STATUSES = ["draft", "active", "archived"] as const;
type Status = (typeof STATUSES)[number];

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

export function BudgetsPanel({
  budgets,
  lines,
  accounts,
}: {
  budgets: BudgetDTO[];
  lines: BudgetLineDTO[];
  accounts: AccountOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [openId, setOpenId] = useState<string | null>(null);
  const [lineAccount, setLineAccount] = useState("");
  const [lineAmount, setLineAmount] = useState("");

  function createBudget(): void {
    startTransition(async () => {
      await newBudget({ name, fiscalYear, status });
      setName("");
      setFiscalYear("");
      setStatus("draft");
      setShowForm(false);
    });
  }

  function submitLine(budgetId: string): void {
    if (!lineAccount) return;
    startTransition(async () => {
      await addLine({
        budgetId,
        accountId: lineAccount,
        amountDollars: lineAmount,
      });
      setLineAccount("");
      setLineAmount("");
    });
  }

  const inputClass =
    "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {budgets.length} budget{budgets.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New budget
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              Budget name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
            <label className={labelClass}>
              Fiscal year
              <input
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="2026"
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
            <label className={labelClass}>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className={`mt-1 w-full ${inputClass}`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={createBudget}
              disabled={pending || !name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save budget"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {budgets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No budgets yet.
          </p>
        ) : (
          budgets.map((b) => {
            const isOpen = openId === b.id;
            const budgetLines = lines.filter((l) => l.budgetId === b.id);
            return (
              <div
                key={b.id}
                className="rounded-xl border border-gray-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(isOpen ? null : b.id);
                    setLineAccount("");
                    setLineAmount("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
                >
                  <span>
                    <span className="font-medium">{b.name}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      FY {b.fiscalYear || "—"} · {b.lineCount} line
                      {b.lineCount === 1 ? "" : "s"} · {b.status}
                    </span>
                  </span>
                  <span className="text-sm text-gray-600">
                    {money(b.totalCents)}
                  </span>
                </button>
                {isOpen ? (
                  <div className="border-t border-gray-100 px-5 py-4">
                    {budgetLines.length > 0 ? (
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100">
                          {budgetLines.map((l) => (
                            <tr key={l.id}>
                              <td className="py-1.5">{l.accountName}</td>
                              <td className="py-1.5 text-right text-gray-600">
                                {money(l.annualAmountCents)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No budget lines yet.
                      </p>
                    )}
                    {accounts.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <select
                          value={lineAccount}
                          onChange={(e) => setLineAccount(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Add account…</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={lineAmount}
                          onChange={(e) => setLineAmount(e.target.value)}
                          placeholder="Annual $"
                          className={`w-32 ${inputClass}`}
                        />
                        <button
                          type="button"
                          onClick={() => submitLine(b.id)}
                          disabled={pending || !lineAccount}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
                        >
                          Add line
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
