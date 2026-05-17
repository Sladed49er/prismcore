"use client";

import { useState, useTransition } from "react";
import { addReconciliation } from "@/app/(shell)/m/accounting/bank-reconciliation/actions";

export interface ReconciliationDTO {
  id: string;
  accountName: string;
  statementDate: string | null;
  statementBalanceCents: number;
  reconciledBalanceCents: number;
  differenceCents: number;
  status: string;
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  accountName: "",
  statementDate: "",
  statementDollars: "",
  reconciledDollars: "",
  status: "in_progress",
  notes: "",
};

export function BankReconciliationPanel({
  reconciliations,
}: {
  reconciliations: ReconciliationDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addReconciliation({
        accountName: form.accountName,
        statementDate: form.statementDate,
        statementDollars: form.statementDollars,
        reconciledDollars: form.reconciledDollars,
        status: form.status as "in_progress" | "completed",
        notes: form.notes,
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
          {reconciliations.length} reconciliation
          {reconciliations.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New reconciliation
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Account
              <input
                value={form.accountName}
                onChange={(e) => set("accountName", e.target.value)}
                placeholder="e.g. Operating Cash — Chase ••1234"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Statement date
              <input
                type="date"
                value={form.statementDate}
                onChange={(e) => set("statementDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Statement balance ($)
              <input
                type="number"
                value={form.statementDollars}
                onChange={(e) => set("statementDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Reconciled balance ($)
              <input
                type="number"
                value={form.reconciledDollars}
                onChange={(e) => set("reconciledDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                <option value="in_progress">in progress</option>
                <option value="completed">completed</option>
              </select>
            </label>
            <label className={labelClass}>
              Notes
              <input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.accountName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save reconciliation"}
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
        {reconciliations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No reconciliations yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold">Statement date</th>
                <th className="px-4 py-3 font-semibold">Statement</th>
                <th className="px-4 py-3 font-semibold">Reconciled</th>
                <th className="px-4 py-3 font-semibold">Difference</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reconciliations.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.accountName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.statementDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(r.statementBalanceCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(r.reconciledBalanceCents)}
                  </td>
                  <td
                    className={`px-4 py-3 ${r.differenceCents === 0 ? "text-green-700" : "text-red-600"}`}
                  >
                    {money(r.differenceCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "completed"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
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
