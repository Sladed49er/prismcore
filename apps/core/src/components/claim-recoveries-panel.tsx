"use client";

import { useState, useTransition } from "react";
import {
  newClaimRecovery,
  updateClaimRecoveryStatus,
} from "@/app/(shell)/m/claims/recoveries/actions";

export interface ClaimOption {
  id: string;
  label: string;
}

export interface ClaimRecoveryDTO {
  id: string;
  claimNumber: string;
  recoveryType: "subrogation" | "salvage" | "deductible" | "other";
  description: string;
  expectedCents: number;
  recoveredCents: number;
  recoveryDate: string | null;
  status: "pursuing" | "recovered" | "closed" | "abandoned";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const TYPE_LABEL: Record<ClaimRecoveryDTO["recoveryType"], string> = {
  subrogation: "Subrogation",
  salvage: "Salvage",
  deductible: "Deductible",
  other: "Other",
};

const STATUS_COLOR: Record<ClaimRecoveryDTO["status"], string> = {
  pursuing: "bg-amber-50 text-amber-700",
  recovered: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
  abandoned: "bg-rose-50 text-rose-700",
};

const EMPTY = {
  claimId: "",
  recoveryType: "subrogation",
  description: "",
  expectedDollars: "",
  recoveredDollars: "",
  recoveryDate: "",
};

export function ClaimRecoveriesPanel({
  recoveries,
  claims,
}: {
  recoveries: ClaimRecoveryDTO[];
  claims: ClaimOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newClaimRecovery({
        ...form,
        recoveryType:
          form.recoveryType as ClaimRecoveryDTO["recoveryType"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: ClaimRecoveryDTO["status"],
  ): void {
    startTransition(async () => {
      await updateClaimRecoveryStatus({ id, status });
    });
  }

  const recovered = recoveries.reduce((s, r) => s + r.recoveredCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {recoveries.length} recover{recoveries.length === 1 ? "y" : "ies"} ·{" "}
          {money(recovered)} recovered
        </p>
        {!showForm && claims.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New recovery
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Claim
              <select
                value={form.claimId}
                onChange={(e) => set("claimId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a claim…</option>
                {claims.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Recovery type
              <select
                value={form.recoveryType}
                onChange={(e) => set("recoveryType", e.target.value)}
                className={inputClass}
              >
                <option value="subrogation">Subrogation</option>
                <option value="salvage">Salvage</option>
                <option value="deductible">Deductible</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className={labelClass}>
              Expected ($)
              <input
                type="number"
                value={form.expectedDollars}
                onChange={(e) => set("expectedDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Recovered ($)
              <input
                type="number"
                value={form.recoveredDollars}
                onChange={(e) => set("recoveredDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Recovery date
              <input
                type="date"
                value={form.recoveryDate}
                onChange={(e) => set("recoveryDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.claimId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save recovery"}
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
        {recoveries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {claims.length === 0
              ? "File a claim first, then pursue its recoveries."
              : "No recoveries tracked yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Claim</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Expected</th>
                <th className="px-4 py-3 font-semibold">Recovered</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recoveries.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.claimNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[r.recoveryType]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {money(r.expectedCents)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(r.recoveredCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          r.id,
                          e.target.value as ClaimRecoveryDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status]}`}
                    >
                      <option value="pursuing">pursuing</option>
                      <option value="recovered">recovered</option>
                      <option value="closed">closed</option>
                      <option value="abandoned">abandoned</option>
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
