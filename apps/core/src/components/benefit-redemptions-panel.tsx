"use client";

import { useState, useTransition } from "react";
import {
  newRedemption,
  removeRedemption,
  type BenefitRedemptionForm,
} from "@/app/(shell)/m/member_benefits/actions";

export interface BenefitRedemptionDTO {
  id: string;
  benefitName: string;
  memberName: string;
  redeemedOn: string | null;
  estimatedValueCents: number;
  notes: string;
}

export interface BenefitOption {
  id: string;
  name: string;
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY: BenefitRedemptionForm = {
  benefitId: "",
  memberName: "",
  redeemedOn: "",
  estimatedValueDollars: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function BenefitRedemptionsPanel({
  redemptions,
  benefits,
}: {
  redemptions: BenefitRedemptionDTO[];
  benefits: BenefitOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BenefitRedemptionForm>({ ...EMPTY });

  function set<K extends keyof BenefitRedemptionForm>(
    key: K,
    value: BenefitRedemptionForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newRedemption(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeRedemption(id);
    });
  }

  const totalValue = redemptions.reduce(
    (s, r) => s + r.estimatedValueCents,
    0,
  );

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {redemptions.length} redemption
          {redemptions.length === 1 ? "" : "s"} · {money(totalValue)} member
          value
        </p>
        {!showForm && benefits.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + Log a redemption
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Benefit
              <select
                value={form.benefitId}
                onChange={(e) => set("benefitId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a benefit…</option>
                {benefits.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Member
              <input
                value={form.memberName}
                onChange={(e) => set("memberName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Redeemed on
              <input
                type="date"
                value={form.redeemedOn}
                onChange={(e) => set("redeemedOn", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Estimated value ($)
              <input
                type="number"
                value={form.estimatedValueDollars}
                onChange={(e) =>
                  set("estimatedValueDollars", e.target.value)
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
              disabled={pending || !form.benefitId || !form.memberName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Log redemption"}
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
        {redemptions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {benefits.length === 0
              ? "Add a benefit first, then log redemptions."
              : "No redemptions logged yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Benefit</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Value</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {redemptions.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3 font-medium">{r.memberName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.benefitName}
                    {r.notes ? (
                      <span className="block text-xs text-gray-400">
                        {r.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.redeemedOn ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {r.estimatedValueCents > 0
                      ? money(r.estimatedValueCents)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
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
