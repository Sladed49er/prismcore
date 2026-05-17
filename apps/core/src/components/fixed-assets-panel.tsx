"use client";

import { useState, useTransition } from "react";
import { addAsset } from "@/app/(shell)/m/accounting/fixed-assets/actions";

export interface FixedAssetDTO {
  id: string;
  name: string;
  category: string;
  acquisitionCostCents: number;
  accumulatedDepreciationCents: number;
  bookValueCents: number;
  method: string;
  acquiredDate: string | null;
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  name: "",
  category: "",
  costDollars: "",
  salvageDollars: "",
  usefulLifeYears: "5",
  method: "straight_line",
  acquiredDate: "",
};

export function FixedAssetsPanel({ assets }: { assets: FixedAssetDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addAsset({
        name: form.name,
        category: form.category,
        costDollars: form.costDollars,
        salvageDollars: form.salvageDollars,
        usefulLifeYears: form.usefulLifeYears,
        method: form.method as "straight_line" | "declining_balance",
        acquiredDate: form.acquiredDate,
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  const totalBook = assets.reduce((s, a) => s + a.bookValueCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {assets.length} asset{assets.length === 1 ? "" : "s"} ·{" "}
          {money(totalBook)} net book value
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New asset
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Asset name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Category
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Computer equipment"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Acquisition cost ($)
              <input
                type="number"
                value={form.costDollars}
                onChange={(e) => set("costDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Salvage value ($)
              <input
                type="number"
                value={form.salvageDollars}
                onChange={(e) => set("salvageDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Useful life (years)
              <input
                type="number"
                value={form.usefulLifeYears}
                onChange={(e) => set("usefulLifeYears", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Acquired date
              <input
                type="date"
                value={form.acquiredDate}
                onChange={(e) => set("acquiredDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Depreciation method
              <select
                value={form.method}
                onChange={(e) => set("method", e.target.value)}
                className={inputClass}
              >
                <option value="straight_line">Straight line</option>
                <option value="declining_balance">Declining balance</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save asset"}
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
        {assets.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No fixed assets yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Asset</th>
                <th className="px-4 py-3 font-semibold">Cost</th>
                <th className="px-4 py-3 font-semibold">Accum. deprec.</th>
                <th className="px-4 py-3 font-semibold">Book value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{a.name}</span>
                    {a.category ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {a.category}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(a.acquisitionCostCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {money(a.accumulatedDepreciationCents)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {money(a.bookValueCents)}
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
