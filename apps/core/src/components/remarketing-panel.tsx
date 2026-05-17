"use client";

import { useState, useTransition } from "react";
import {
  newRemarketingQuote,
  updateQuoteStatus,
} from "@/app/(shell)/m/renewals/remarketing/actions";

export interface RenewalOption {
  id: string;
  label: string;
}

export interface RemarketingQuoteDTO {
  id: string;
  policyNumber: string;
  clientName: string;
  carrierName: string;
  quotedPremiumCents: number;
  coverageSummary: string;
  status: "requested" | "received" | "declined" | "selected";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const STATUS_COLOR: Record<RemarketingQuoteDTO["status"], string> = {
  requested: "bg-gray-100 text-gray-600",
  received: "bg-blue-50 text-blue-700",
  declined: "bg-rose-50 text-rose-700",
  selected: "bg-emerald-50 text-emerald-700",
};

const EMPTY = {
  renewalId: "",
  carrierName: "",
  quotedPremiumDollars: "",
  coverageSummary: "",
  notes: "",
};

export function RemarketingPanel({
  quotes,
  renewals,
}: {
  quotes: RemarketingQuoteDTO[];
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
      await newRemarketingQuote(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: RemarketingQuoteDTO["status"],
  ): void {
    startTransition(async () => {
      await updateQuoteStatus({ id, status });
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {quotes.length} quote{quotes.length === 1 ? "" : "s"} on the
          worksheet
        </p>
        {!showForm && renewals.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Add quote
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
              Carrier
              <input
                value={form.carrierName}
                onChange={(e) => set("carrierName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Quoted premium ($)
              <input
                type="number"
                value={form.quotedPremiumDollars}
                onChange={(e) =>
                  set("quotedPremiumDollars", e.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Coverage summary
              <input
                value={form.coverageSummary}
                onChange={(e) => set("coverageSummary", e.target.value)}
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
                pending || !form.renewalId || !form.carrierName.trim()
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save quote"}
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
        {quotes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {renewals.length === 0
              ? "Add a renewal first, then shop it to carriers."
              : "No remarketing quotes yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Carrier</th>
                <th className="px-4 py-3 font-semibold">Quoted premium</th>
                <th className="px-4 py-3 font-semibold">Coverage</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{q.policyNumber}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {q.clientName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{q.carrierName}</td>
                  <td className="px-4 py-3 font-medium">
                    {money(q.quotedPremiumCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {q.coverageSummary || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={q.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          q.id,
                          e.target.value as RemarketingQuoteDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[q.status]}`}
                    >
                      <option value="requested">requested</option>
                      <option value="received">received</option>
                      <option value="declined">declined</option>
                      <option value="selected">selected</option>
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
