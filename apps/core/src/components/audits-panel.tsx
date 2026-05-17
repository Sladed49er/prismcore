"use client";

import { useState, useTransition } from "react";
import {
  newAudit,
  updateAuditStatus,
} from "@/app/(shell)/m/policies/audits/actions";

export interface PolicyOption {
  id: string;
  label: string;
}

export interface AuditDTO {
  id: string;
  policyNumber: string;
  auditType: string;
  periodStart: string | null;
  periodEnd: string | null;
  estimatedPremiumCents: number;
  auditedPremiumCents: number;
  adjustmentCents: number;
  status: "scheduled" | "in_progress" | "completed" | "disputed";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

function signedMoney(cents: number): string {
  const sign = cents < 0 ? "-" : cents > 0 ? "+" : "";
  return sign + "$" + (Math.abs(cents) / 100).toLocaleString();
}

const STATUS_COLOR: Record<AuditDTO["status"], string> = {
  scheduled: "bg-gray-100 text-gray-600",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  disputed: "bg-rose-50 text-rose-700",
};

const EMPTY = {
  policyId: "",
  auditType: "",
  periodStart: "",
  periodEnd: "",
  estimatedPremiumDollars: "",
  auditedPremiumDollars: "",
  notes: "",
};

export function AuditsPanel({
  audits,
  policies,
}: {
  audits: AuditDTO[];
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
      await newAudit(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: AuditDTO["status"]): void {
    startTransition(async () => {
      await updateAuditStatus({ id, status });
    });
  }

  const netAdjustment = audits
    .filter((a) => a.status === "completed")
    .reduce((s, a) => s + a.adjustmentCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {audits.length} audit{audits.length === 1 ? "" : "s"} ·{" "}
          {signedMoney(netAdjustment)} net completed adjustment
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New audit
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
              Audit type
              <input
                value={form.auditType}
                onChange={(e) => set("auditType", e.target.value)}
                placeholder="e.g. Workers Comp, General Liability"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Period start
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => set("periodStart", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Period end
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => set("periodEnd", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Estimated premium ($)
              <input
                type="number"
                value={form.estimatedPremiumDollars}
                onChange={(e) =>
                  set("estimatedPremiumDollars", e.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Audited premium ($)
              <input
                type="number"
                value={form.auditedPremiumDollars}
                onChange={(e) =>
                  set("auditedPremiumDollars", e.target.value)
                }
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
              disabled={pending || !form.policyId || !form.auditType.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save audit"}
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
        {audits.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {policies.length === 0
              ? "Add a policy first, then schedule its premium audits."
              : "No premium audits yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Estimated</th>
                <th className="px-4 py-3 font-semibold">Audited</th>
                <th className="px-4 py-3 font-semibold">Adjustment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {audits.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{a.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{a.auditType}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {money(a.estimatedPremiumCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(a.auditedPremiumCents)}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      a.adjustmentCents < 0
                        ? "text-rose-600"
                        : "text-gray-900"
                    }`}
                  >
                    {signedMoney(a.adjustmentCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          a.id,
                          e.target.value as AuditDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[a.status]}`}
                    >
                      <option value="scheduled">scheduled</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
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
