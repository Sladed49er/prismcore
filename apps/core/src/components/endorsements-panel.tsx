"use client";

import { useState, useTransition } from "react";
import {
  newEndorsement,
  updateEndorsementStatus,
} from "@/app/(shell)/m/policies/endorsements/actions";

export interface PolicyOption {
  id: string;
  label: string;
}

export interface EndorsementDTO {
  id: string;
  policyNumber: string;
  endorsementNumber: string;
  effectiveDate: string | null;
  description: string;
  premiumChangeCents: number;
  status: "pending" | "issued" | "voided";
}

function signedMoney(cents: number): string {
  const sign = cents < 0 ? "-" : cents > 0 ? "+" : "";
  return sign + "$" + (Math.abs(cents) / 100).toLocaleString();
}

const EMPTY = {
  policyId: "",
  endorsementNumber: "",
  effectiveDate: "",
  description: "",
  premiumChangeDollars: "",
};

const STATUS_COLOR: Record<EndorsementDTO["status"], string> = {
  pending: "text-amber-600",
  issued: "text-emerald-600",
  voided: "text-gray-400 line-through",
};

export function EndorsementsPanel({
  endorsements,
  policies,
}: {
  endorsements: EndorsementDTO[];
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
      await newEndorsement(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: EndorsementDTO["status"]): void {
    startTransition(async () => {
      await updateEndorsementStatus({ id, status });
    });
  }

  const netChange = endorsements
    .filter((e) => e.status === "issued")
    .reduce((s, e) => s + e.premiumChangeCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {endorsements.length} endorsement
          {endorsements.length === 1 ? "" : "s"} · {signedMoney(netChange)}{" "}
          net issued premium
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New endorsement
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
              Endorsement number
              <input
                value={form.endorsementNumber}
                onChange={(e) => set("endorsementNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Effective date
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => set("effectiveDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Premium change ($)
              <input
                type="number"
                value={form.premiumChangeDollars}
                onChange={(e) =>
                  set("premiumChangeDollars", e.target.value)
                }
                placeholder="negative for a return"
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
              disabled={
                pending || !form.policyId || !form.endorsementNumber.trim()
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save endorsement"}
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
        {endorsements.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {policies.length === 0
              ? "Add a policy first, then record its endorsements."
              : "No endorsements yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Endt #</th>
                <th className="px-4 py-3 font-semibold">Effective</th>
                <th className="px-4 py-3 font-semibold">Premium Δ</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {endorsements.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium">{e.policyNumber}</td>
                  <td className="px-4 py-3">
                    <span>{e.endorsementNumber}</span>
                    {e.description ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {e.description}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.effectiveDate ?? "—"}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      e.premiumChangeCents < 0
                        ? "text-rose-600"
                        : "text-gray-900"
                    }`}
                  >
                    {signedMoney(e.premiumChangeCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={e.status}
                      disabled={pending}
                      onChange={(ev) =>
                        changeStatus(
                          e.id,
                          ev.target.value as EndorsementDTO["status"],
                        )
                      }
                      className={`rounded border border-gray-200 bg-transparent px-1 py-0.5 text-xs font-semibold ${STATUS_COLOR[e.status]}`}
                    >
                      <option value="pending">pending</option>
                      <option value="issued">issued</option>
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
