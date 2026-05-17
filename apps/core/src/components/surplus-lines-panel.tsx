"use client";

import { useState, useTransition } from "react";
import {
  newSurplusLines,
  updateSurplusLinesStatus,
} from "@/app/(shell)/m/accounting/surplus-lines/actions";

export interface SurplusLinesDTO {
  id: string;
  policyReference: string;
  state: string;
  premiumCents: number;
  taxRatePercent: string;
  taxCents: number;
  stampingFeeCents: number;
  filingFeeCents: number;
  totalDueCents: number;
  dueDate: string | null;
  status: "pending" | "filed" | "paid";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  policyReference: "",
  state: "",
  premiumDollars: "",
  taxRatePercent: "",
  stampingFeeDollars: "",
  filingFeeDollars: "",
  dueDate: "",
};

const STATUS_COLOR: Record<SurplusLinesDTO["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  filed: "bg-blue-50 text-blue-700",
  paid: "bg-emerald-50 text-emerald-700",
};

export function SurplusLinesPanel({ rows }: { rows: SurplusLinesDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newSurplusLines(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: SurplusLinesDTO["status"]): void {
    startTransition(async () => {
      await updateSurplusLinesStatus({ id, status });
    });
  }

  const outstanding = rows
    .filter((r) => r.status !== "paid")
    .reduce((s, r) => s + r.totalDueCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rows.length} filing{rows.length === 1 ? "" : "s"} ·{" "}
          {money(outstanding)} unpaid
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New filing
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Policy reference
              <input
                value={form.policyReference}
                onChange={(e) => set("policyReference", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              State
              <input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="e.g. CA"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Premium ($)
              <input
                type="number"
                value={form.premiumDollars}
                onChange={(e) => set("premiumDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Tax rate (%)
              <input
                type="number"
                value={form.taxRatePercent}
                onChange={(e) => set("taxRatePercent", e.target.value)}
                placeholder="e.g. 3"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Stamping fee ($)
              <input
                type="number"
                value={form.stampingFeeDollars}
                onChange={(e) => set("stampingFeeDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Filing fee ($)
              <input
                type="number"
                value={form.filingFeeDollars}
                onChange={(e) => set("filingFeeDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Due date
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Tax is computed as premium × rate. Total due adds stamping and
            filing fees.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.policyReference.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save filing"}
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
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No surplus-lines tax filings yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3 font-semibold">Premium</th>
                <th className="px-4 py-3 font-semibold">Tax</th>
                <th className="px-4 py-3 font-semibold">Total due</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">
                    {r.policyReference}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.state || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(r.premiumCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(r.taxCents)}
                    {r.taxRatePercent ? (
                      <span className="ml-1 text-xs text-gray-400">
                        @ {r.taxRatePercent}%
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(r.totalDueCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          r.id,
                          e.target.value as SurplusLinesDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status]}`}
                    >
                      <option value="pending">pending</option>
                      <option value="filed">filed</option>
                      <option value="paid">paid</option>
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
