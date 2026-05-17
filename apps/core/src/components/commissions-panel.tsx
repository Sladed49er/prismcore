"use client";

import { useState, useTransition } from "react";
import {
  addCommission,
  advanceCommission,
} from "@/app/(shell)/m/commissions/register/actions";

export interface CommissionDTO {
  id: string;
  policyNumber: string;
  clientName: string;
  amountCents: number;
  ratePercent: string;
  status: string;
  receivedDate: string | null;
}

export interface PolicyOption {
  id: string;
  label: string;
}

const STATUSES = ["pending", "received", "reconciled"] as const;
type Status = (typeof STATUSES)[number];

const STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  received: "bg-blue-50 text-blue-700",
  reconciled: "bg-green-50 text-green-700",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  amountDollars: "",
  ratePercent: "",
  status: "pending",
  receivedDate: "",
};

export function CommissionsPanel({
  commissions,
  policies,
}: {
  commissions: CommissionDTO[];
  policies: PolicyOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [policyId, setPolicyId] = useState("");
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addCommission({
        policyId,
        amountDollars: form.amountDollars,
        ratePercent: form.ratePercent,
        status: form.status as Status,
        receivedDate: form.receivedDate,
      });
      setForm({ ...EMPTY });
      setPolicyId("");
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: Status): void {
    startTransition(async () => {
      await advanceCommission(id, status);
    });
  }

  const total = commissions.reduce((sum, c) => sum + c.amountCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {commissions.length} record{commissions.length === 1 ? "" : "s"} ·{" "}
          {money(total)} total
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New commission
          </button>
        ) : null}
      </div>

      {policies.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a policy first — commissions are tracked against a policy.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Policy
              <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
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
              Amount ($)
              <input
                type="number"
                value={form.amountDollars}
                onChange={(e) => set("amountDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Rate (%)
              <input
                value={form.ratePercent}
                onChange={(e) => set("ratePercent", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Received date
              <input
                type="date"
                value={form.receivedDate}
                onChange={(e) => set("receivedDate", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !policyId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save commission"}
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
        {commissions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No commission records yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Insured</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Rate</th>
                <th className="px-4 py-3 font-semibold">Received</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commissions.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{c.clientName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(c.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.ratePercent ? `${c.ratePercent}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.receivedDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={(e) =>
                        changeStatus(c.id, e.target.value as Status)
                      }
                      disabled={pending}
                      aria-label="Commission status"
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
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
