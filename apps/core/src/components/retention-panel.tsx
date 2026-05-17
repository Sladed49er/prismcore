"use client";

import { useState, useTransition } from "react";
import { newRetentionRecord } from "@/app/(shell)/m/renewals/retention/actions";

export interface RenewalOption {
  id: string;
  label: string;
}

export interface RetentionRecordDTO {
  id: string;
  policyNumber: string;
  clientName: string;
  outcome: "renewed" | "rewritten" | "lost" | "non_renewed";
  reasonCode:
    | "price"
    | "coverage"
    | "service"
    | "carrier_exit"
    | "claims"
    | "other";
  priorPremiumCents: number;
  newPremiumCents: number;
  recordedDate: string | null;
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const OUTCOME_LABEL: Record<RetentionRecordDTO["outcome"], string> = {
  renewed: "Renewed",
  rewritten: "Rewritten",
  lost: "Lost",
  non_renewed: "Non-renewed",
};

const OUTCOME_COLOR: Record<RetentionRecordDTO["outcome"], string> = {
  renewed: "bg-emerald-50 text-emerald-700",
  rewritten: "bg-blue-50 text-blue-700",
  lost: "bg-rose-50 text-rose-700",
  non_renewed: "bg-amber-50 text-amber-700",
};

const REASON_LABEL: Record<RetentionRecordDTO["reasonCode"], string> = {
  price: "Price",
  coverage: "Coverage",
  service: "Service",
  carrier_exit: "Carrier exit",
  claims: "Claims",
  other: "Other",
};

const EMPTY = {
  renewalId: "",
  outcome: "renewed",
  reasonCode: "price",
  priorPremiumDollars: "",
  newPremiumDollars: "",
  recordedDate: "",
  notes: "",
};

export function RetentionPanel({
  records,
  renewals,
}: {
  records: RetentionRecordDTO[];
  renewals: RenewalOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newRetentionRecord({
        ...form,
        outcome: form.outcome as RetentionRecordDTO["outcome"],
        reasonCode: form.reasonCode as RetentionRecordDTO["reasonCode"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  const kept = records.filter(
    (r) => r.outcome === "renewed" || r.outcome === "rewritten",
  ).length;
  const retentionRate =
    records.length > 0
      ? Math.round((kept / records.length) * 100)
      : 0;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {records.length} record{records.length === 1 ? "" : "s"} ·{" "}
          {retentionRate}% retained
        </p>
        {!showForm && renewals.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Record outcome
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Renewal
              <select
                value={form.renewalId}
                onChange={(e) => set("renewalId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a renewal…</option>
                {renewals.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Outcome
              <select
                value={form.outcome}
                onChange={(e) => set("outcome", e.target.value)}
                className={inputClass}
              >
                <option value="renewed">Renewed</option>
                <option value="rewritten">Rewritten</option>
                <option value="lost">Lost</option>
                <option value="non_renewed">Non-renewed</option>
              </select>
            </label>
            <label className={labelClass}>
              Reason
              <select
                value={form.reasonCode}
                onChange={(e) => set("reasonCode", e.target.value)}
                className={inputClass}
              >
                <option value="price">Price</option>
                <option value="coverage">Coverage</option>
                <option value="service">Service</option>
                <option value="carrier_exit">Carrier exit</option>
                <option value="claims">Claims</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className={labelClass}>
              Recorded date
              <input
                type="date"
                value={form.recordedDate}
                onChange={(e) => set("recordedDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Prior premium ($)
              <input
                type="number"
                value={form.priorPremiumDollars}
                onChange={(e) =>
                  set("priorPremiumDollars", e.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              New premium ($)
              <input
                type="number"
                value={form.newPremiumDollars}
                onChange={(e) => set("newPremiumDollars", e.target.value)}
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
              disabled={pending || !form.renewalId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save record"}
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
        {records.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {renewals.length === 0
              ? "Add a renewal first, then record its outcome."
              : "No retention records yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Outcome</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Prior premium</th>
                <th className="px-4 py-3 font-semibold">New premium</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.policyNumber}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {r.clientName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${OUTCOME_COLOR[r.outcome]}`}
                    >
                      {OUTCOME_LABEL[r.outcome]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {REASON_LABEL[r.reasonCode]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {money(r.priorPremiumCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(r.newPremiumCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.recordedDate ?? "—"}
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
