"use client";

import { useState, useTransition } from "react";
import {
  newLeadSource,
  toggleLeadSource,
} from "@/app/(shell)/m/pipeline/sources/actions";

export interface LeadSourceDTO {
  id: string;
  name: string;
  sourceType:
    | "referral"
    | "web"
    | "campaign"
    | "partner"
    | "cold"
    | "event"
    | "other";
  description: string;
  isActive: boolean;
}

const TYPE_LABEL: Record<LeadSourceDTO["sourceType"], string> = {
  referral: "Referral",
  web: "Web",
  campaign: "Campaign",
  partner: "Partner",
  cold: "Cold",
  event: "Event",
  other: "Other",
};

const EMPTY = { name: "", sourceType: "referral", description: "" };

export function LeadSourcesPanel({
  sources,
}: {
  sources: LeadSourceDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newLeadSource({
        ...form,
        sourceType: form.sourceType as LeadSourceDTO["sourceType"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function toggle(id: string, isActive: boolean): void {
    startTransition(async () => {
      await toggleLeadSource({ id, isActive: !isActive });
    });
  }

  const active = sources.filter((s) => s.isActive).length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {sources.length} source{sources.length === 1 ? "" : "s"} ·{" "}
          {active} active
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New source
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
              Source type
              <select
                value={form.sourceType}
                onChange={(e) => set("sourceType", e.target.value)}
                className={inputClass}
              >
                <option value="referral">Referral</option>
                <option value="web">Web</option>
                <option value="campaign">Campaign</option>
                <option value="partner">Partner</option>
                <option value="cold">Cold</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
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
              {pending ? "Saving…" : "Save source"}
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
        {sources.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No lead sources defined yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{s.name}</span>
                    {s.description ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {s.description}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[s.sourceType]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(s.id, s.isActive)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      {s.isActive ? "Deactivate" : "Reactivate"}
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
