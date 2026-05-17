"use client";

import { useState, useTransition } from "react";
import { newReserveEntry } from "@/app/(shell)/m/claims/reserves/actions";

export interface ClaimOption {
  id: string;
  label: string;
}

export interface ReserveEntryDTO {
  id: string;
  claimNumber: string;
  entryDate: string | null;
  reserveType: "indemnity" | "expense" | "legal" | "medical";
  changeCents: number;
  reason: string;
}

function signedMoney(cents: number): string {
  const sign = cents < 0 ? "-" : cents > 0 ? "+" : "";
  return sign + "$" + (Math.abs(cents) / 100).toLocaleString();
}

const TYPE_LABEL: Record<ReserveEntryDTO["reserveType"], string> = {
  indemnity: "Indemnity",
  expense: "Expense",
  legal: "Legal",
  medical: "Medical",
};

const EMPTY = {
  claimId: "",
  entryDate: "",
  reserveType: "indemnity",
  changeDollars: "",
  reason: "",
};

export function ReservesPanel({
  entries,
  claims,
}: {
  entries: ReserveEntryDTO[];
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
      await newReserveEntry({
        ...form,
        reserveType: form.reserveType as ReserveEntryDTO["reserveType"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  const netReserve = entries.reduce((s, e) => s + e.changeCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {entries.length} reserve entr{entries.length === 1 ? "y" : "ies"} ·{" "}
          {signedMoney(netReserve)} net outstanding reserve
        </p>
        {!showForm && claims.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Reserve change
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
              Reserve type
              <select
                value={form.reserveType}
                onChange={(e) => set("reserveType", e.target.value)}
                className={inputClass}
              >
                <option value="indemnity">Indemnity</option>
                <option value="expense">Expense</option>
                <option value="legal">Legal</option>
                <option value="medical">Medical</option>
              </select>
            </label>
            <label className={labelClass}>
              Entry date
              <input
                type="date"
                value={form.entryDate}
                onChange={(e) => set("entryDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Reserve change ($)
              <input
                type="number"
                value={form.changeDollars}
                onChange={(e) => set("changeDollars", e.target.value)}
                placeholder="negative to release reserve"
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Reason
              <input
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.claimId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Post reserve change"}
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
        {entries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {claims.length === 0
              ? "File a claim first, then post its reserve changes."
              : "No reserve entries yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Claim</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Change</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium">{e.claimNumber}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.entryDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[e.reserveType]}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      e.changeCents < 0 ? "text-rose-600" : "text-gray-900"
                    }`}
                  >
                    {signedMoney(e.changeCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.reason || "—"}
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
