"use client";

import { useState, useTransition } from "react";
import { newCoverage } from "@/app/(shell)/m/policies/coverages/actions";

export interface PolicyOption {
  id: string;
  label: string;
}

export interface CoverageDTO {
  id: string;
  policyNumber: string;
  coverageType: string;
  limitText: string;
  deductibleCents: number;
  premiumCents: number;
  notes: string;
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  policyId: "",
  coverageType: "",
  limitText: "",
  deductibleDollars: "",
  premiumDollars: "",
  notes: "",
};

export function CoveragesPanel({
  coverages,
  policies,
}: {
  coverages: CoverageDTO[];
  policies: PolicyOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newCoverage(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  const totalPremium = coverages.reduce((s, c) => s + c.premiumCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {coverages.length} coverage line{coverages.length === 1 ? "" : "s"} ·{" "}
          {money(totalPremium)} premium
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Add coverage
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Policy
              <select
                value={form.policyId}
                onChange={(e) => set("policyId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a policy…</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Coverage type
              <input
                value={form.coverageType}
                onChange={(e) => set("coverageType", e.target.value)}
                placeholder="e.g. General Liability"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Limit
              <input
                value={form.limitText}
                onChange={(e) => set("limitText", e.target.value)}
                placeholder="e.g. $1M / $2M"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Deductible ($)
              <input
                type="number"
                value={form.deductibleDollars}
                onChange={(e) => set("deductibleDollars", e.target.value)}
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
            <label className={`${labelClass} sm:col-span-2`}>
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
              disabled={
                pending || !form.policyId || !form.coverageType.trim()
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save coverage"}
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
        {coverages.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {policies.length === 0
              ? "Add a policy first, then write its coverage lines."
              : "No coverage lines yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Coverage</th>
                <th className="px-4 py-3 font-semibold">Limit</th>
                <th className="px-4 py-3 font-semibold">Deductible</th>
                <th className="px-4 py-3 font-semibold">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coverages.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.policyNumber}</td>
                  <td className="px-4 py-3">
                    <span>{c.coverageType}</span>
                    {c.notes ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {c.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.limitText || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {money(c.deductibleCents)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(c.premiumCents)}
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
