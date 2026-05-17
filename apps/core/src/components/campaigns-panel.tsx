"use client";

import { useState, useTransition } from "react";
import {
  newCampaign,
  updateCampaignStatus,
} from "@/app/(shell)/m/pipeline/campaigns/actions";

export interface CampaignDTO {
  id: string;
  name: string;
  channel: string;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number;
  status: "planned" | "active" | "completed" | "cancelled";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const STATUS_COLOR: Record<CampaignDTO["status"], string> = {
  planned: "bg-gray-100 text-gray-600",
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-rose-50 text-rose-700",
};

const EMPTY = {
  name: "",
  channel: "",
  startDate: "",
  endDate: "",
  budgetDollars: "",
  notes: "",
};

export function CampaignsPanel({
  campaigns,
}: {
  campaigns: CampaignDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newCampaign(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: CampaignDTO["status"]): void {
    startTransition(async () => {
      await updateCampaignStatus({ id, status });
    });
  }

  const activeBudget = campaigns
    .filter((c) => c.status === "active" || c.status === "planned")
    .reduce((s, c) => s + c.budgetCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} ·{" "}
          {money(activeBudget)} planned/active budget
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New campaign
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Campaign name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Channel
              <input
                value={form.channel}
                onChange={(e) => set("channel", e.target.value)}
                placeholder="e.g. Email, Direct mail, LinkedIn"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Start date
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              End date
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Budget ($)
              <input
                type="number"
                value={form.budgetDollars}
                onChange={(e) => set("budgetDollars", e.target.value)}
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
              {pending ? "Saving…" : "Save campaign"}
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
        {campaigns.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No campaigns yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Campaign</th>
                <th className="px-4 py-3 font-semibold">Channel</th>
                <th className="px-4 py-3 font-semibold">Dates</th>
                <th className="px-4 py-3 font-semibold">Budget</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.channel || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.startDate ?? "—"}
                    {c.endDate ? ` → ${c.endDate}` : ""}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(c.budgetCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          c.id,
                          e.target.value as CampaignDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[c.status]}`}
                    >
                      <option value="planned">planned</option>
                      <option value="active">active</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
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
