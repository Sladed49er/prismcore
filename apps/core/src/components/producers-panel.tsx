"use client";

import { useState, useTransition } from "react";
import {
  newProducer,
  updateProducerStatus,
} from "@/app/(shell)/m/commissions/producers/actions";

export interface ProducerDTO {
  id: string;
  name: string;
  code: string;
  email: string;
  defaultRatePercent: string;
  status: "active" | "inactive";
}

const EMPTY = { name: "", code: "", email: "", defaultRatePercent: "" };

export function ProducersPanel({ producers }: { producers: ProducerDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newProducer(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function toggle(id: string, status: ProducerDTO["status"]): void {
    startTransition(async () => {
      await updateProducerStatus({
        id,
        status: status === "active" ? "inactive" : "active",
      });
    });
  }

  const active = producers.filter((p) => p.status === "active").length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {producers.length} producer{producers.length === 1 ? "" : "s"} ·{" "}
          {active} active
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New producer
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
              Producer code
              <input
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
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
              Default commission rate (%)
              <input
                type="number"
                value={form.defaultRatePercent}
                onChange={(e) => set("defaultRatePercent", e.target.value)}
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
              {pending ? "Saving…" : "Save producer"}
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
        {producers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No producers yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Producer</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Default rate</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {producers.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.name}</span>
                    {p.email ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {p.email}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.code || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.defaultRatePercent ? `${p.defaultRatePercent}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(p.id, p.status)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      {p.status === "active" ? "Deactivate" : "Reactivate"}
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
