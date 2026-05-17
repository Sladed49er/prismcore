"use client";

import { useState, useTransition } from "react";
import {
  newCommissionStatement,
  updateStatementStatus,
} from "@/app/(shell)/m/commissions/statements/actions";

export interface CommissionStatementDTO {
  id: string;
  carrierName: string;
  statementDate: string | null;
  periodLabel: string;
  expectedCents: number;
  reportedCents: number;
  varianceCents: number;
  status: "received" | "reconciled" | "disputed";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

function signedMoney(cents: number): string {
  const sign = cents < 0 ? "-" : cents > 0 ? "+" : "";
  return sign + "$" + (Math.abs(cents) / 100).toLocaleString();
}

const STATUS_COLOR: Record<CommissionStatementDTO["status"], string> = {
  received: "bg-amber-50 text-amber-700",
  reconciled: "bg-emerald-50 text-emerald-700",
  disputed: "bg-rose-50 text-rose-700",
};

const EMPTY = {
  carrierName: "",
  statementDate: "",
  periodLabel: "",
  expectedDollars: "",
  reportedDollars: "",
  notes: "",
};

export function CommissionStatementsPanel({
  statements,
}: {
  statements: CommissionStatementDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newCommissionStatement(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: CommissionStatementDTO["status"],
  ): void {
    startTransition(async () => {
      await updateStatementStatus({ id, status });
    });
  }

  const openVariance = statements
    .filter((s) => s.status !== "reconciled")
    .reduce((s, x) => s + x.varianceCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {statements.length} statement{statements.length === 1 ? "" : "s"} ·{" "}
          {signedMoney(openVariance)} unreconciled variance
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New statement
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Carrier
              <input
                value={form.carrierName}
                onChange={(e) => set("carrierName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Period
              <input
                value={form.periodLabel}
                onChange={(e) => set("periodLabel", e.target.value)}
                placeholder="e.g. April 2026"
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
              Expected commission ($)
              <input
                type="number"
                value={form.expectedDollars}
                onChange={(e) => set("expectedDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Reported commission ($)
              <input
                type="number"
                value={form.reportedDollars}
                onChange={(e) => set("reportedDollars", e.target.value)}
                className={inputClass}
              />
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
              disabled={pending || !form.carrierName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save statement"}
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
        {statements.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No carrier statements yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Carrier</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Expected</th>
                <th className="px-4 py-3 font-semibold">Reported</th>
                <th className="px-4 py-3 font-semibold">Variance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statements.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{s.carrierName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.periodLabel || s.statementDate || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {money(s.expectedCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(s.reportedCents)}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      s.varianceCents < 0
                        ? "text-rose-600"
                        : s.varianceCents > 0
                          ? "text-emerald-600"
                          : "text-gray-400"
                    }`}
                  >
                    {signedMoney(s.varianceCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={s.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          s.id,
                          e.target.value as CommissionStatementDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[s.status]}`}
                    >
                      <option value="received">received</option>
                      <option value="reconciled">reconciled</option>
                      <option value="disputed">disputed</option>
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
