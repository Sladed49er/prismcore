"use client";

import { useState, useTransition } from "react";
import { addCarrier } from "@/app/(shell)/m/carriers/actions";

export interface CarrierDTO {
  id: string;
  name: string;
  naicCode: string;
  appetite: string;
  contactName: string;
  contactEmail: string;
  status: string;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  prospective: "bg-amber-50 text-amber-700",
  inactive: "bg-gray-100 text-gray-500",
};

const EMPTY = {
  name: "",
  naicCode: "",
  appetite: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  status: "active",
  notes: "",
};

export function CarriersPanel({ carriers }: { carriers: CarrierDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addCarrier({
        name: form.name,
        naicCode: form.naicCode,
        appetite: form.appetite,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        status: form.status as "active" | "prospective" | "inactive",
        notes: form.notes,
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
          {carriers.length} carrier{carriers.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New carrier
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Carrier name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              NAIC code
              <input
                value={form.naicCode}
                onChange={(e) => set("naicCode", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Appetite
              <input
                value={form.appetite}
                onChange={(e) => set("appetite", e.target.value)}
                placeholder="What they write — lines, classes, states"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contact name
              <input
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contact email
              <input
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contact phone
              <input
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                <option value="active">active</option>
                <option value="prospective">prospective</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
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
              {pending ? "Saving…" : "Save carrier"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm({ ...EMPTY });
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {carriers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No carriers yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Carrier</th>
                <th className="px-4 py-3 font-semibold">NAIC</th>
                <th className="px-4 py-3 font-semibold">Appetite</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {carriers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.naicCode || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.appetite || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.contactName || c.contactEmail || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {c.status}
                    </span>
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
