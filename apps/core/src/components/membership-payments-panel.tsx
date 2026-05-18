"use client";

import { useState, useTransition } from "react";
import {
  newPayment,
  removePayment,
  type MembershipPaymentForm,
} from "@/app/(shell)/m/memberships/actions";

export interface MembershipPaymentDTO {
  id: string;
  memberName: string;
  amountCents: number;
  paymentDate: string | null;
  method: string;
  period: string;
  notes: string;
}

export interface MemberOption {
  id: string;
  name: string;
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY: MembershipPaymentForm = {
  membershipId: "",
  amountDollars: "",
  paymentDate: "",
  method: "",
  period: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function MembershipPaymentsPanel({
  payments,
  members,
}: {
  payments: MembershipPaymentDTO[];
  members: MemberOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MembershipPaymentForm>({ ...EMPTY });

  function set<K extends keyof MembershipPaymentForm>(
    key: K,
    value: MembershipPaymentForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newPayment(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removePayment(id);
    });
  }

  const total = payments.reduce((s, p) => s + p.amountCents, 0);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {payments.length} payment{payments.length === 1 ? "" : "s"} ·{" "}
          {money(total)} collected
        </p>
        {!showForm && members.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + Record payment
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Member
              <select
                value={form.membershipId}
                onChange={(e) => set("membershipId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
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
              Payment date
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set("paymentDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Method
              <input
                value={form.method}
                onChange={(e) => set("method", e.target.value)}
                placeholder="check · card · ach · cash"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Period covered
              <input
                value={form.period}
                onChange={(e) => set("period", e.target.value)}
                placeholder="e.g. 2026 annual dues"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
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
              disabled={pending || !form.membershipId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Record payment"}
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
            {members.length === 0
              ? "Add a member first, then record dues payments."
              : "No dues payments recorded yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-3 font-medium">{p.memberName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.paymentDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(p.amountCents)}
                    {p.method ? (
                      <span className="block text-xs text-gray-400">
                        {p.method}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.period || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      disabled={pending}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Delete
                    </button>
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
