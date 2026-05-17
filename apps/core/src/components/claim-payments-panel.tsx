"use client";

import { useState, useTransition } from "react";
import {
  newClaimPayment,
  updateClaimPaymentStatus,
} from "@/app/(shell)/m/claims/payments/actions";

export interface ClaimOption {
  id: string;
  label: string;
}

export interface ClaimPaymentDTO {
  id: string;
  claimNumber: string;
  paymentDate: string | null;
  payee: string;
  paymentType: "indemnity" | "expense" | "legal" | "medical";
  amountCents: number;
  checkNumber: string;
  status: "pending" | "issued" | "cleared" | "voided";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const TYPE_LABEL: Record<ClaimPaymentDTO["paymentType"], string> = {
  indemnity: "Indemnity",
  expense: "Expense",
  legal: "Legal",
  medical: "Medical",
};

const STATUS_COLOR: Record<ClaimPaymentDTO["status"], string> = {
  pending: "text-amber-600",
  issued: "text-blue-600",
  cleared: "text-emerald-600",
  voided: "text-gray-400 line-through",
};

const EMPTY = {
  claimId: "",
  paymentDate: "",
  payee: "",
  paymentType: "indemnity",
  amountDollars: "",
  checkNumber: "",
};

export function ClaimPaymentsPanel({
  payments,
  claims,
}: {
  payments: ClaimPaymentDTO[];
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
      await newClaimPayment({
        ...form,
        paymentType: form.paymentType as ClaimPaymentDTO["paymentType"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: ClaimPaymentDTO["status"]): void {
    startTransition(async () => {
      await updateClaimPaymentStatus({ id, status });
    });
  }

  const paid = payments
    .filter((p) => p.status !== "voided")
    .reduce((s, p) => s + p.amountCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {payments.length} payment{payments.length === 1 ? "" : "s"} ·{" "}
          {money(paid)} paid loss &amp; expense
        </p>
        {!showForm && claims.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New payment
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
              Payment type
              <select
                value={form.paymentType}
                onChange={(e) => set("paymentType", e.target.value)}
                className={inputClass}
              >
                <option value="indemnity">Indemnity</option>
                <option value="expense">Expense</option>
                <option value="legal">Legal</option>
                <option value="medical">Medical</option>
              </select>
            </label>
            <label className={labelClass}>
              Payee
              <input
                value={form.payee}
                onChange={(e) => set("payee", e.target.value)}
                className={inputClass}
              />
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
              Payment date
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set("paymentDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Check number
              <input
                value={form.checkNumber}
                onChange={(e) => set("checkNumber", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.claimId || !form.payee.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save payment"}
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
        {payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {claims.length === 0
              ? "File a claim first, then record its payments."
              : "No claim payments yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Claim</th>
                <th className="px-4 py-3 font-semibold">Payee</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.claimNumber}</td>
                  <td className="px-4 py-3">
                    <span>{p.payee}</span>
                    {p.checkNumber ? (
                      <span className="ml-2 text-xs text-gray-400">
                        #{p.checkNumber}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[p.paymentType]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.paymentDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(p.amountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          p.id,
                          e.target.value as ClaimPaymentDTO["status"],
                        )
                      }
                      className={`rounded border border-gray-200 bg-transparent px-1 py-0.5 text-xs font-semibold ${STATUS_COLOR[p.status]}`}
                    >
                      <option value="pending">pending</option>
                      <option value="issued">issued</option>
                      <option value="cleared">cleared</option>
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
