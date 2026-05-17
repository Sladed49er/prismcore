"use client";

import { useState, useTransition } from "react";
import {
  newLead,
  updateLeadStatus,
} from "@/app/(shell)/m/pipeline/leads/actions";

export interface LeadDTO {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  lineOfBusiness: string;
  estimatedValueCents: number;
  status: "new" | "working" | "qualified" | "converted" | "disqualified";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const STATUS_COLOR: Record<LeadDTO["status"], string> = {
  new: "bg-blue-50 text-blue-700",
  working: "bg-amber-50 text-amber-700",
  qualified: "bg-indigo-50 text-indigo-700",
  converted: "bg-emerald-50 text-emerald-700",
  disqualified: "bg-gray-100 text-gray-500",
};

const EMPTY = {
  name: "",
  company: "",
  email: "",
  phone: "",
  source: "",
  lineOfBusiness: "",
  estimatedValueDollars: "",
  notes: "",
};

export function LeadsPanel({ leads }: { leads: LeadDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newLead(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: LeadDTO["status"]): void {
    startTransition(async () => {
      await updateLeadStatus({ id, status });
    });
  }

  const openValue = leads
    .filter((l) => l.status !== "converted" && l.status !== "disqualified")
    .reduce((s, l) => s + l.estimatedValueCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {leads.length} lead{leads.length === 1 ? "" : "s"} ·{" "}
          {money(openValue)} open estimated value
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New lead
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Company
              <input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
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
            <label className={labelClass}>
              Phone
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Source
              <input
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                placeholder="e.g. Referral, Website"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Line of business
              <input
                value={form.lineOfBusiness}
                onChange={(e) => set("lineOfBusiness", e.target.value)}
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
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save lead"}
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
        {leads.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No leads yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Lead</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Line</th>
                <th className="px-4 py-3 font-semibold">Est. value</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{l.name}</span>
                    {l.company ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {l.company}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {l.source || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {l.lineOfBusiness || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(l.estimatedValueCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          l.id,
                          e.target.value as LeadDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[l.status]}`}
                    >
                      <option value="new">new</option>
                      <option value="working">working</option>
                      <option value="qualified">qualified</option>
                      <option value="converted">converted</option>
                      <option value="disqualified">disqualified</option>
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
