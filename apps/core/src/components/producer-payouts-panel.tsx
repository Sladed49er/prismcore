"use client";

import { useState, useTransition } from "react";
import {
  newProducerPayout,
  payProducerPayout,
} from "@/app/(shell)/m/commissions/payouts/actions";

export interface ProducerOption {
  id: string;
  label: string;
}

export interface ProducerPayoutDTO {
  id: string;
  producerName: string;
  payoutDate: string | null;
  periodLabel: string;
  amountCents: number;
  method: string;
  status: "scheduled" | "paid";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  producerId: "",
  payoutDate: "",
  periodLabel: "",
  amountDollars: "",
  method: "check",
};

export function ProducerPayoutsPanel({
  payouts,
  producers,
}: {
  payouts: ProducerPayoutDTO[];
  producers: ProducerOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newProducerPayout(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function pay(id: string): void {
    startTransition(async () => {
      await payProducerPayout({ id });
    });
  }

  const scheduled = payouts
    .filter((p) => p.status === "scheduled")
    .reduce((s, p) => s + p.amountCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {payouts.length} payout{payouts.length === 1 ? "" : "s"} ·{" "}
          {money(scheduled)} scheduled
        </p>
        {!showForm && producers.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New payout
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Producer
              <select
                value={form.producerId}
                onChange={(e) => set("producerId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a producer…</option>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
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
              Payout date
              <input
                type="date"
                value={form.payoutDate}
                onChange={(e) => set("payoutDate", e.target.value)}
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
              Method
              <select
                value={form.method}
                onChange={(e) => set("method", e.target.value)}
                className={inputClass}
              >
                <option value="check">Check</option>
                <option value="ACH">ACH</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.producerId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save payout"}
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
        {payouts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {producers.length === 0
              ? "Add a producer first, then schedule payouts."
              : "No producer payouts yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Producer</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.producerName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.periodLabel || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.payoutDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(p.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.method}</td>
                  <td className="px-4 py-3">
                    {p.status === "paid" ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        paid
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => pay(p.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                      >
                        Mark paid
                      </button>
                    )}
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
