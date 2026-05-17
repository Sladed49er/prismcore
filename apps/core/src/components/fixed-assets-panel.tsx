"use client";

import { useState, useTransition } from "react";
import {
  addAsset,
  editAsset,
  removeAsset,
} from "@/app/(shell)/m/accounting/fixed-assets/actions";

export interface FixedAssetDTO {
  id: string;
  name: string;
  category: string;
  acquisitionCostCents: number;
  salvageValueCents: number;
  usefulLifeYears: number;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [query, setQuery] = useState("");

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startCreate(): void {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(a: FixedAssetDTO): void {
    setForm({
      name: a.name,
      category: a.category,
      costDollars: String(a.acquisitionCostCents / 100),
      salvageDollars: String(a.salvageValueCents / 100),
      usefulLifeYears: String(a.usefulLifeYears),
      method: a.method,
      acquiredDate: a.acquiredDate ?? "",
    });
    setEditingId(a.id);
    setShowForm(true);
  }

  function close(): void {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY });
  }

  function submit(): void {
    startTransition(async () => {
      const payload = {
        name: form.name,
        category: form.category,
        costDollars: form.costDollars,
        salvageDollars: form.salvageDollars,
        usefulLifeYears: form.usefulLifeYears,
        method: form.method as "straight_line" | "declining_balance",
        acquiredDate: form.acquiredDate,
      };
      if (editingId) {
        await editAsset({ id: editingId, ...payload });
      } else {
        await addAsset(payload);
      }
      close();
    });
  }

  function remove(a: FixedAssetDTO): void {
    if (!confirm(`Delete asset "${a.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await removeAsset(a.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? assets.filter((a) =>
        [a.name, a.category].join(" ").toLowerCase().includes(q),
      )
    : assets;

  const totalBook = assets.reduce((s, a) => s + a.bookValueCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets…"
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {money(totalBook)} net book value
          </span>
          {!showForm ? (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              + New asset
            </button>
          ) : null}
        </div>
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit asset" : "New asset"}
          </p>
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
              {pending
                ? "Saving…"
                : editingId
                  ? "Update asset"
                  : "Save asset"}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {assets.length === 0
              ? "No fixed assets yet."
              : "No assets match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Asset</th>
                <th className="px-4 py-3 font-semibold">Cost</th>
                <th className="px-4 py-3 font-semibold">Accum. deprec.</th>
                <th className="px-4 py-3 font-semibold">Book value</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((a) => (
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
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(a)}
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(a)}
                      className="ml-3 text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                    >
                      Delete
                    </button>
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
