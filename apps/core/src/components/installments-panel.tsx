"use client";

import { useState, useTransition } from "react";
import {
  newInstallment,
  payInstallment,
} from "@/app/(shell)/m/policies/installments/actions";

export interface PolicyOption {
  id: string;
  label: string;
}

export interface InstallmentDTO {
  id: string;
  policyNumber: string;
  installmentNumber: number;
  dueDate: string | null;
  amountCents: number;
  paidCents: number;
  status: "scheduled" | "paid";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  policyId: "",
  installmentNumber: "1",
  dueDate: "",
  amountDollars: "",
};

export function InstallmentsPanel({
  installments,
  policies,
}: {
  installments: InstallmentDTO[];
  policies: PolicyOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [payInput, setPayInput] = useState<Record<string, string>>({});

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newInstallment(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function pay(id: string, fallback: number): void {
    const entered = payInput[id];
    const dollars =
      entered && entered.trim() ? entered : String(fallback / 100);
    startTransition(async () => {
      await payInstallment({ id, paidDollars: dollars });
    });
  }

  const scheduled = installments
    .filter((i) => i.status === "scheduled")
    .reduce((s, i) => s + i.amountCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {installments.length} installment
          {installments.length === 1 ? "" : "s"} · {money(scheduled)}{" "}
          scheduled
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Add installment
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
              Installment number
              <input
                type="number"
                value={form.installmentNumber}
                onChange={(e) => set("installmentNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Due date
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
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
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.policyId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save installment"}
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
        {installments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {policies.length === 0
              ? "Add a policy first, then build its billing schedule."
              : "No installments scheduled."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {installments.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium">{i.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {i.installmentNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {i.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(i.amountCents)}
                  </td>
                  <td className="px-4 py-3">
                    {i.status === "paid" ? (
                      <span className="font-medium text-emerald-700">
                        {money(i.paidCents)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder={String(i.amountCents / 100)}
                          value={payInput[i.id] ?? ""}
                          onChange={(e) =>
                            setPayInput((p) => ({
                              ...p,
                              [i.id]: e.target.value,
                            }))
                          }
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => pay(i.id, i.amountCents)}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                        >
                          Mark paid
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        i.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {i.status}
                    </span>
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
