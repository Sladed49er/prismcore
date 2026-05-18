"use client";

import { useState, useTransition } from "react";
import {
  newTimesheet,
  removeTimesheet,
  type TaxTimesheetForm,
} from "@/app/(shell)/m/tax_practice/actions";

export interface TaxTimesheetDTO {
  id: string;
  engagementId: string;
  engagementLabel: string;
  workDate: string | null;
  minutes: number;
  description: string;
  preparerName: string;
  billable: boolean;
}

export interface EngagementOption {
  id: string;
  label: string;
}

function hoursLabel(minutes: number): string {
  return (minutes / 60).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

const EMPTY: TaxTimesheetForm = {
  engagementId: "",
  workDate: "",
  hours: "",
  description: "",
  preparerName: "",
  billable: true,
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function TaxTimesheetsPanel({
  entries,
  engagements,
}: {
  entries: TaxTimesheetDTO[];
  engagements: EngagementOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TaxTimesheetForm>({ ...EMPTY });

  function set<K extends keyof TaxTimesheetForm>(
    key: K,
    value: TaxTimesheetForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newTimesheet(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeTimesheet(id);
    });
  }

  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const billableMinutes = entries
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.minutes, 0);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {entries.length} entr{entries.length === 1 ? "y" : "ies"} ·{" "}
          {hoursLabel(totalMinutes)} h logged · {hoursLabel(billableMinutes)} h
          billable
        </p>
        {!showForm && engagements.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + Log time
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Engagement
              <select
                value={form.engagementId}
                onChange={(e) => set("engagementId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select an engagement…</option>
                {engagements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Date
              <input
                type="date"
                value={form.workDate}
                onChange={(e) => set("workDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Hours
              <input
                type="number"
                step="0.25"
                value={form.hours}
                onChange={(e) => set("hours", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Preparer
              <input
                value={form.preparerName}
                onChange={(e) => set("preparerName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.billable}
                onChange={(e) => set("billable", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Billable
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.engagementId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Log time"}
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
            {engagements.length === 0
              ? "Add a tax engagement first, then log time against it."
              : "No time logged yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Engagement</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Hours</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-4 py-3 text-gray-500">
                    {e.workDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.engagementLabel}
                  </td>
                  <td className="px-4 py-3">
                    {e.description || "—"}
                    {e.preparerName ? (
                      <span className="block text-xs text-gray-400">
                        {e.preparerName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {hoursLabel(e.minutes)}
                    {!e.billable ? (
                      <span className="ml-1 text-xs text-gray-400">
                        non-billable
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
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
