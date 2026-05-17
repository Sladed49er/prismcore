"use client";

import { useState, useTransition } from "react";
import {
  newClaimLitigation,
  updateLitigationStatus,
} from "@/app/(shell)/m/claims/litigation/actions";

export interface ClaimOption {
  id: string;
  label: string;
}

export interface ClaimLitigationDTO {
  id: string;
  claimNumber: string;
  caseCaption: string;
  court: string;
  docketNumber: string;
  defenseAttorney: string;
  filedDate: string | null;
  trialDate: string | null;
  status:
    | "pre_suit"
    | "filed"
    | "discovery"
    | "trial"
    | "settled"
    | "dismissed"
    | "closed";
}

const STATUS_COLOR: Record<ClaimLitigationDTO["status"], string> = {
  pre_suit: "bg-gray-100 text-gray-600",
  filed: "bg-amber-50 text-amber-700",
  discovery: "bg-blue-50 text-blue-700",
  trial: "bg-rose-50 text-rose-700",
  settled: "bg-emerald-50 text-emerald-700",
  dismissed: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

const EMPTY = {
  claimId: "",
  caseCaption: "",
  court: "",
  docketNumber: "",
  defenseAttorney: "",
  filedDate: "",
  trialDate: "",
};

export function ClaimLitigationPanel({
  suits,
  claims,
}: {
  suits: ClaimLitigationDTO[];
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
      await newClaimLitigation(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: ClaimLitigationDTO["status"],
  ): void {
    startTransition(async () => {
      await updateLitigationStatus({ id, status });
    });
  }

  const active = suits.filter(
    (s) => !["settled", "dismissed", "closed"].includes(s.status),
  ).length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {suits.length} suit{suits.length === 1 ? "" : "s"} · {active} active
        </p>
        {!showForm && claims.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New suit
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
              Defense attorney
              <input
                value={form.defenseAttorney}
                onChange={(e) => set("defenseAttorney", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Case caption
              <input
                value={form.caseCaption}
                onChange={(e) => set("caseCaption", e.target.value)}
                placeholder="e.g. Doe v. Acme Corp."
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Court
              <input
                value={form.court}
                onChange={(e) => set("court", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Docket number
              <input
                value={form.docketNumber}
                onChange={(e) => set("docketNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Filed date
              <input
                type="date"
                value={form.filedDate}
                onChange={(e) => set("filedDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Trial date
              <input
                type="date"
                value={form.trialDate}
                onChange={(e) => set("trialDate", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.claimId || !form.caseCaption.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save suit"}
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
        {suits.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {claims.length === 0
              ? "File a claim first, then track any litigation."
              : "No litigation tracked yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Claim</th>
                <th className="px-4 py-3 font-semibold">Case</th>
                <th className="px-4 py-3 font-semibold">Court</th>
                <th className="px-4 py-3 font-semibold">Trial date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suits.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{s.claimNumber}</td>
                  <td className="px-4 py-3">
                    <span>{s.caseCaption}</span>
                    {s.docketNumber ? (
                      <span className="ml-2 text-xs text-gray-400">
                        #{s.docketNumber}
                      </span>
                    ) : null}
                    {s.defenseAttorney ? (
                      <span className="block text-xs text-gray-400">
                        Defense: {s.defenseAttorney}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.court || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.trialDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={s.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          s.id,
                          e.target.value as ClaimLitigationDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[s.status]}`}
                    >
                      <option value="pre_suit">pre_suit</option>
                      <option value="filed">filed</option>
                      <option value="discovery">discovery</option>
                      <option value="trial">trial</option>
                      <option value="settled">settled</option>
                      <option value="dismissed">dismissed</option>
                      <option value="closed">closed</option>
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
