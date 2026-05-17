"use client";

import { useState, useTransition } from "react";
import { addAccount } from "@/app/(shell)/m/accounting/chart-of-accounts/actions";

export interface AccountDTO {
  id: string;
  accountNumber: string;
  name: string;
  type: string;
  subtype: string;
  isActive: boolean;
}

const TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;
type Type = (typeof TYPES)[number];

const TYPE_STYLE: Record<string, string> = {
  asset: "bg-blue-50 text-blue-700",
  liability: "bg-amber-50 text-amber-700",
  equity: "bg-purple-50 text-purple-700",
  revenue: "bg-green-50 text-green-700",
  expense: "bg-red-50 text-red-700",
};

const EMPTY = {
  accountNumber: "",
  name: "",
  type: "asset",
  subtype: "",
  description: "",
};

export function ChartOfAccountsPanel({
  accounts,
}: {
  accounts: AccountDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addAccount({
        accountNumber: form.accountNumber,
        name: form.name,
        type: form.type as Type,
        subtype: form.subtype,
        description: form.description,
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {accounts.length} account{accounts.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New account
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Account number
              <input
                value={form.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                placeholder="e.g. 1000"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Account name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Type
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Subtype
              <input
                value={form.subtype}
                onChange={(e) => set("subtype", e.target.value)}
                placeholder="e.g. Current Asset"
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={
                pending || !form.accountNumber.trim() || !form.name.trim()
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save account"}
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

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {accounts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No accounts yet — add your chart of accounts above.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Number</th>
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Subtype</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((a) => (
                <tr key={a.id} className={a.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {a.accountNumber}
                  </td>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[a.type] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.subtype || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
