"use client";

import { useState, useTransition } from "react";
import {
  newQuarterlyTax,
  payQuarterlyTax,
} from "@/app/(shell)/m/accounting/quarterly-taxes/actions";

export interface QuarterlyTaxDTO {
  id: string;
  taxType: string;
  year: string;
  quarter: string;
  estimatedCents: number;
  paidCents: number;
  dueDate: string | null;
  status: "scheduled" | "paid";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  taxType: "",
  year: String(new Date().getFullYear()),
  quarter: "Q1",
  estimatedDollars: "",
  dueDate: "",
};

export function QuarterlyTaxesPanel({ rows }: { rows: QuarterlyTaxDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [payInput, setPayInput] = useState<Record<string, string>>({});

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newQuarterlyTax(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function pay(id: string, fallback: number): void {
    const entered = payInput[id];
    const dollars =
      entered && entered.trim() ? entered : String(fallback / 100);
    startTransition(async () => {
      await payQuarterlyTax({ id, paidDollars: dollars });
    });
  }

  const scheduled = rows
    .filter((r) => r.status === "scheduled")
    .reduce((s, r) => s + r.estimatedCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rows.length} payment{rows.length === 1 ? "" : "s"} ·{" "}
          {money(scheduled)} scheduled
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Schedule payment
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Tax type
              <input
                value={form.taxType}
                onChange={(e) => set("taxType", e.target.value)}
                placeholder="e.g. Federal estimated"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Year
              <input
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Quarter
              <select
                value={form.quarter}
                onChange={(e) => set("quarter", e.target.value)}
                className={inputClass}
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </label>
            <label className={labelClass}>
              Estimated amount ($)
              <input
                type="number"
                value={form.estimatedDollars}
                onChange={(e) => set("estimatedDollars", e.target.value)}
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
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.taxType.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save payment"}
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
            No quarterly tax payments scheduled yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Tax type</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Estimated</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.taxType}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.year} {r.quarter}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(r.estimatedCents)}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "paid" ? (
                      <span className="font-medium text-emerald-700">
                        {money(r.paidCents)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder={String(r.estimatedCents / 100)}
                          value={payInput[r.id] ?? ""}
                          onChange={(e) =>
                            setPayInput((p) => ({
                              ...p,
                              [r.id]: e.target.value,
                            }))
                          }
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => pay(r.id, r.estimatedCents)}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                        >
                          Mark paid
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {r.status}
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
