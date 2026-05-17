"use client";

import { useState, useTransition } from "react";
import {
  newCancellation,
  updateCancellationStatus,
} from "@/app/(shell)/m/policies/cancellations/actions";

export interface PolicyOption {
  id: string;
  label: string;
}

export interface CancellationDTO {
  id: string;
  policyNumber: string;
  requestDate: string | null;
  effectiveDate: string | null;
  reason: string;
  cancellationType: "flat" | "pro_rata" | "short_rate";
  returnPremiumCents: number;
  status: "requested" | "processed" | "reinstated";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const TYPE_LABEL: Record<CancellationDTO["cancellationType"], string> = {
  flat: "Flat",
  pro_rata: "Pro-rata",
  short_rate: "Short-rate",
};

const STATUS_COLOR: Record<CancellationDTO["status"], string> = {
  requested: "bg-amber-50 text-amber-700",
  processed: "bg-rose-50 text-rose-700",
  reinstated: "bg-emerald-50 text-emerald-700",
};

const EMPTY = {
  policyId: "",
  requestDate: "",
  effectiveDate: "",
  reason: "",
  cancellationType: "pro_rata",
  returnPremiumDollars: "",
};

export function CancellationsPanel({
  cancellations,
  policies,
}: {
  cancellations: CancellationDTO[];
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
      await newCancellation({
        ...form,
        cancellationType:
          form.cancellationType as CancellationDTO["cancellationType"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: CancellationDTO["status"]): void {
    startTransition(async () => {
      await updateCancellationStatus({ id, status });
    });
  }

  const returned = cancellations
    .filter((c) => c.status === "processed")
    .reduce((s, c) => s + c.returnPremiumCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {cancellations.length} cancellation
          {cancellations.length === 1 ? "" : "s"} · {money(returned)} return
          premium
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New cancellation
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
              Cancellation type
              <select
                value={form.cancellationType}
                onChange={(e) => set("cancellationType", e.target.value)}
                className={inputClass}
              >
                <option value="flat">Flat</option>
                <option value="pro_rata">Pro-rata</option>
                <option value="short_rate">Short-rate</option>
              </select>
            </label>
            <label className={labelClass}>
              Request date
              <input
                type="date"
                value={form.requestDate}
                onChange={(e) => set("requestDate", e.target.value)}
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
              Return premium ($)
              <input
                type="number"
                value={form.returnPremiumDollars}
                onChange={(e) =>
                  set("returnPremiumDollars", e.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Reason
              <input
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                placeholder="e.g. Insured request, non-payment, rewrite"
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.policyId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save cancellation"}
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
        {cancellations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {policies.length === 0
              ? "Add a policy first, then track its cancellations."
              : "No cancellations recorded."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Requested</th>
                <th className="px-4 py-3 font-semibold">Effective</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Return premium</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cancellations.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.requestDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.effectiveDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[c.cancellationType]}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(c.returnPremiumCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          c.id,
                          e.target.value as CancellationDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[c.status]}`}
                    >
                      <option value="requested">requested</option>
                      <option value="processed">processed</option>
                      <option value="reinstated">reinstated</option>
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
