"use client";

import { useState, useTransition } from "react";
import {
  newCheck,
  updateCheckStatus,
} from "@/app/(shell)/m/accounting/checks/actions";

export interface CheckDTO {
  id: string;
  checkNumber: string;
  payee: string;
  amountCents: number;
  checkDate: string | null;
  memo: string;
  status: "printed" | "cleared" | "voided";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  checkNumber: "",
  payee: "",
  amountDollars: "",
  checkDate: "",
  memo: "",
};

const STATUS_COLOR: Record<CheckDTO["status"], string> = {
  printed: "text-blue-600",
  cleared: "text-emerald-600",
  voided: "text-gray-400 line-through",
};

export function ChecksPanel({ checks }: { checks: CheckDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newCheck(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: CheckDTO["status"]): void {
    startTransition(async () => {
      await updateCheckStatus({ id, status });
    });
  }

  const outstanding = checks
    .filter((c) => c.status === "printed")
    .reduce((s, c) => s + c.amountCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {checks.length} check{checks.length === 1 ? "" : "s"} ·{" "}
          {money(outstanding)} outstanding
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Record check
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Check number
              <input
                value={form.checkNumber}
                onChange={(e) => set("checkNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Payee
              <input
                value={form.payee}
                onChange={(e) => set("payee", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Amount ($)
              <input
                type="number"
                value={form.amountDollars}
                onChange={(e) => set("amountDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Check date
              <input
                type="date"
                value={form.checkDate}
                onChange={(e) => set("checkDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Memo
              <input
                value={form.memo}
                onChange={(e) => set("memo", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={
                pending || !form.checkNumber.trim() || !form.payee.trim()
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save check"}
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
        {checks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No checks recorded yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Check #</th>
                <th className="px-4 py-3 font-semibold">Payee</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {checks.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.checkNumber}</td>
                  <td className="px-4 py-3">
                    <span>{c.payee}</span>
                    {c.memo ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {c.memo}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.checkDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(c.amountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          c.id,
                          e.target.value as CheckDTO["status"],
                        )
                      }
                      className={`rounded border border-gray-200 bg-transparent px-1 py-0.5 text-xs font-semibold ${STATUS_COLOR[c.status]}`}
                    >
                      <option value="printed">printed</option>
                      <option value="cleared">cleared</option>
                      <option value="voided">voided</option>
                    </select>
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
