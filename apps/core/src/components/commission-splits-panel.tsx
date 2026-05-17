"use client";

import { useState, useTransition } from "react";
import { newCommissionSplit } from "@/app/(shell)/m/commissions/splits/actions";

export interface CommissionOption {
  id: string;
  label: string;
}

export interface ProducerOption {
  id: string;
  label: string;
}

export interface CommissionSplitDTO {
  id: string;
  policyNumber: string;
  commissionAmountCents: number;
  producerName: string;
  sharePercent: string;
  amountCents: number;
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  commissionId: "",
  producerId: "",
  sharePercent: "",
  amountDollars: "",
};

export function CommissionSplitsPanel({
  splits,
  commissions,
  producers,
}: {
  splits: CommissionSplitDTO[];
  commissions: CommissionOption[];
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
      await newCommissionSplit(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  const canAdd = commissions.length > 0 && producers.length > 0;
  const totalSplit = splits.reduce((s, x) => s + x.amountCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {splits.length} split{splits.length === 1 ? "" : "s"} ·{" "}
          {money(totalSplit)} allocated to producers
        </p>
        {!showForm && canAdd ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New split
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Commission
              <select
                value={form.commissionId}
                onChange={(e) => set("commissionId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a commission…</option>
                {commissions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
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
              Share (%)
              <input
                type="number"
                value={form.sharePercent}
                onChange={(e) => set("sharePercent", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Split amount ($)
              <input
                type="number"
                value={form.amountDollars}
                onChange={(e) => set("amountDollars", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.commissionId || !form.producerId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save split"}
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
        {splits.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {canAdd
              ? "No commission splits yet."
              : "Add commissions and producers first, then split a commission."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Producer</th>
                <th className="px-4 py-3 font-semibold">Commission</th>
                <th className="px-4 py-3 font-semibold">Share</th>
                <th className="px-4 py-3 font-semibold">Split amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {splits.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{s.policyNumber}</td>
                  <td className="px-4 py-3">{s.producerName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {money(s.commissionAmountCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.sharePercent ? `${s.sharePercent}%` : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(s.amountCents)}
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
