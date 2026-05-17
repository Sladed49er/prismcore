"use client";

import { useState, useTransition } from "react";
import { addClaim, advanceClaim } from "@/app/(shell)/m/claims/register/actions";

export interface ClaimDTO {
  id: string;
  claimNumber: string;
  policyNumber: string;
  clientName: string;
  dateOfLoss: string | null;
  status: string;
  reserveCents: number;
}

export interface PolicyOption {
  id: string;
  label: string;
}

const STATUSES = [
  "open",
  "investigating",
  "paid",
  "closed",
  "denied",
] as const;
type Status = (typeof STATUSES)[number];

const STYLE: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  investigating: "bg-amber-50 text-amber-700",
  paid: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  denied: "bg-red-50 text-red-700",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  claimNumber: "",
  dateOfLoss: "",
  description: "",
  status: "open",
  reserveDollars: "",
};

export function ClaimsPanel({
  claims,
  policies,
}: {
  claims: ClaimDTO[];
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
      await addClaim({
        policyId,
        claimNumber: form.claimNumber,
        dateOfLoss: form.dateOfLoss,
        description: form.description,
        status: form.status as Status,
        reserveDollars: form.reserveDollars,
      });
      setForm({ ...EMPTY });
      setPolicyId("");
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: Status): void {
    startTransition(async () => {
      await advanceClaim(id, status);
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
          {claims.length} claim{claims.length === 1 ? "" : "s"}
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New claim
          </button>
        ) : null}
      </div>

      {policies.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a policy first — a claim is filed against a policy.
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
              Claim number
              <input
                value={form.claimNumber}
                onChange={(e) => set("claimNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Date of loss
              <input
                type="date"
                value={form.dateOfLoss}
                onChange={(e) => set("dateOfLoss", e.target.value)}
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
              Reserve ($)
              <input
                type="number"
                value={form.reserveDollars}
                onChange={(e) => set("reserveDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !policyId || !form.claimNumber.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save claim"}
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
        {claims.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No claims yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Claim #</th>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Insured</th>
                <th className="px-4 py-3 font-semibold">Loss date</th>
                <th className="px-4 py-3 font-semibold">Reserve</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {claims.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.claimNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{c.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{c.clientName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.dateOfLoss ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(c.reserveCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={(e) =>
                        changeStatus(c.id, e.target.value as Status)
                      }
                      disabled={pending}
                      aria-label="Claim status"
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
