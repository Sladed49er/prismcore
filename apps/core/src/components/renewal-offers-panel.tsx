"use client";

import { useState, useTransition } from "react";
import {
  newRenewalOffer,
  updateOfferStatus,
} from "@/app/(shell)/m/renewals/offers/actions";

export interface RenewalOption {
  id: string;
  label: string;
}

export interface RenewalOfferDTO {
  id: string;
  policyNumber: string;
  clientName: string;
  carrierName: string;
  offerDate: string | null;
  premiumCents: number;
  priorPremiumCents: number;
  changeCents: number;
  expiresDate: string | null;
  status: "draft" | "presented" | "accepted" | "declined";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

function signedMoney(cents: number): string {
  const sign = cents < 0 ? "-" : cents > 0 ? "+" : "";
  return sign + "$" + (Math.abs(cents) / 100).toLocaleString();
}

const STATUS_COLOR: Record<RenewalOfferDTO["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  presented: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-rose-50 text-rose-700",
};

const EMPTY = {
  renewalId: "",
  carrierName: "",
  offerDate: "",
  premiumDollars: "",
  priorPremiumDollars: "",
  termSummary: "",
  expiresDate: "",
};

export function RenewalOffersPanel({
  offers,
  renewals,
}: {
  offers: RenewalOfferDTO[];
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
      await newRenewalOffer(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: RenewalOfferDTO["status"]): void {
    startTransition(async () => {
      await updateOfferStatus({ id, status });
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
          {offers.length} offer{offers.length === 1 ? "" : "s"}
        </p>
        {!showForm && renewals.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New offer
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
              Renewal premium ($)
              <input
                type="number"
                value={form.premiumDollars}
                onChange={(e) => set("premiumDollars", e.target.value)}
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
              Offer date
              <input
                type="date"
                value={form.offerDate}
                onChange={(e) => set("offerDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Expires
              <input
                type="date"
                value={form.expiresDate}
                onChange={(e) => set("expiresDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Term summary
              <input
                value={form.termSummary}
                onChange={(e) => set("termSummary", e.target.value)}
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
              {pending ? "Saving…" : "Save offer"}
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
        {offers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {renewals.length === 0
              ? "Add a renewal first, then build its offer."
              : "No renewal offers yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Carrier</th>
                <th className="px-4 py-3 font-semibold">Premium</th>
                <th className="px-4 py-3 font-semibold">Change</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{o.policyNumber}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {o.clientName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {o.carrierName || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(o.premiumCents)}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      o.changeCents > 0
                        ? "text-rose-600"
                        : o.changeCents < 0
                          ? "text-emerald-600"
                          : "text-gray-400"
                    }`}
                  >
                    {signedMoney(o.changeCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {o.expiresDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          o.id,
                          e.target.value as RenewalOfferDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status]}`}
                    >
                      <option value="draft">draft</option>
                      <option value="presented">presented</option>
                      <option value="accepted">accepted</option>
                      <option value="declined">declined</option>
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
