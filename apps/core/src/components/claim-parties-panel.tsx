"use client";

import { useState, useTransition } from "react";
import { newClaimParty } from "@/app/(shell)/m/claims/parties/actions";

export interface ClaimOption {
  id: string;
  label: string;
}

export interface ClaimPartyDTO {
  id: string;
  claimNumber: string;
  role:
    | "claimant"
    | "insured"
    | "witness"
    | "adjuster"
    | "attorney"
    | "third_party"
    | "expert"
    | "other";
  name: string;
  organization: string;
  phone: string;
  email: string;
  notes: string;
}

const ROLE_LABEL: Record<ClaimPartyDTO["role"], string> = {
  claimant: "Claimant",
  insured: "Insured",
  witness: "Witness",
  adjuster: "Adjuster",
  attorney: "Attorney",
  third_party: "Third party",
  expert: "Expert",
  other: "Other",
};

const EMPTY = {
  claimId: "",
  role: "claimant",
  name: "",
  organization: "",
  phone: "",
  email: "",
  notes: "",
};

export function ClaimPartiesPanel({
  parties,
  claims,
}: {
  parties: ClaimPartyDTO[];
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
      await newClaimParty({
        ...form,
        role: form.role as ClaimPartyDTO["role"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
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
          {parties.length} part{parties.length === 1 ? "y" : "ies"} on file
        </p>
        {!showForm && claims.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Add party
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
              Role
              <select
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className={inputClass}
              >
                <option value="claimant">Claimant</option>
                <option value="insured">Insured</option>
                <option value="witness">Witness</option>
                <option value="adjuster">Adjuster</option>
                <option value="attorney">Attorney</option>
                <option value="third_party">Third party</option>
                <option value="expert">Expert</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className={labelClass}>
              Name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Organization
              <input
                value={form.organization}
                onChange={(e) => set("organization", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
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
              disabled={pending || !form.claimId || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save party"}
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
        {parties.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {claims.length === 0
              ? "File a claim first, then record its parties."
              : "No parties on file yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Claim</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parties.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.claimNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {ROLE_LABEL[p.role]}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.name}</span>
                    {p.organization ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {p.organization}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.phone || p.email ? (
                      <>
                        {p.phone}
                        {p.phone && p.email ? " · " : ""}
                        {p.email}
                      </>
                    ) : (
                      "—"
                    )}
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
