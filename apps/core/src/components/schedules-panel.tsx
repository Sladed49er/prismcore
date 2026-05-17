"use client";

import { useState, useTransition } from "react";
import { newScheduleItem } from "@/app/(shell)/m/policies/schedules/actions";

export interface PolicyOption {
  id: string;
  label: string;
}

export interface ScheduleItemDTO {
  id: string;
  policyNumber: string;
  itemType: "vehicle" | "driver" | "location" | "equipment" | "other";
  description: string;
  identifier: string;
  valueCents: number;
  notes: string;
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const TYPE_LABEL: Record<ScheduleItemDTO["itemType"], string> = {
  vehicle: "Vehicle",
  driver: "Driver",
  location: "Location",
  equipment: "Equipment",
  other: "Other",
};

const EMPTY = {
  policyId: "",
  itemType: "vehicle",
  description: "",
  identifier: "",
  valueDollars: "",
  notes: "",
};

export function SchedulesPanel({
  items,
  policies,
}: {
  items: ScheduleItemDTO[];
  policies: PolicyOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newScheduleItem({
        ...form,
        itemType: form.itemType as ScheduleItemDTO["itemType"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  const totalValue = items.reduce((s, i) => s + i.valueCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {items.length} scheduled item{items.length === 1 ? "" : "s"} ·{" "}
          {money(totalValue)} insured value
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Add item
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
              Item type
              <select
                value={form.itemType}
                onChange={(e) => set("itemType", e.target.value)}
                className={inputClass}
              >
                <option value="vehicle">Vehicle</option>
                <option value="driver">Driver</option>
                <option value="location">Location</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className={labelClass}>
              Description
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Identifier
              <input
                value={form.identifier}
                onChange={(e) => set("identifier", e.target.value)}
                placeholder="VIN, license, address, serial…"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Insured value ($)
              <input
                type="number"
                value={form.valueDollars}
                onChange={(e) => set("valueDollars", e.target.value)}
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
              disabled={
                pending || !form.policyId || !form.description.trim()
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save item"}
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
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {policies.length === 0
              ? "Add a policy first, then schedule its insured items."
              : "No scheduled items yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Identifier</th>
                <th className="px-4 py-3 font-semibold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium">{i.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[i.itemType]}
                  </td>
                  <td className="px-4 py-3">
                    <span>{i.description}</span>
                    {i.notes ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {i.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {i.identifier || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(i.valueCents)}
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
