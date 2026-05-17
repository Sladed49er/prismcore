"use client";

import { useState, useTransition } from "react";
import {
  newPeriod,
  updatePeriodStatus,
  editPeriod,
  removePeriod,
} from "@/app/(shell)/m/accounting/fiscal-periods/actions";

export interface PeriodDTO {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: "open" | "closed";
}

const EMPTY = { name: "", startDate: "", endDate: "" };

export function FiscalPeriodsPanel({ periods }: { periods: PeriodDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [query, setQuery] = useState("");

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startCreate(): void {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(p: PeriodDTO): void {
    setForm({
      name: p.name,
      startDate: p.startDate ?? "",
      endDate: p.endDate ?? "",
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  function close(): void {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY });
  }

  function submit(): void {
    startTransition(async () => {
      if (editingId) {
        await editPeriod({ id: editingId, ...form });
      } else {
        await newPeriod(form);
      }
      close();
    });
  }

  function toggle(id: string, status: PeriodDTO["status"]): void {
    startTransition(async () => {
      await updatePeriodStatus({
        id,
        status: status === "open" ? "closed" : "open",
      });
    });
  }

  function remove(p: PeriodDTO): void {
    if (!confirm(`Delete fiscal period "${p.name}"?`)) return;
    startTransition(async () => {
      await removePeriod(p.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? periods.filter((p) => p.name.toLowerCase().includes(q))
    : periods;

  const openCount = periods.filter((p) => p.status === "open").length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search periods…"
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{openCount} open</span>
          {!showForm ? (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              + New period
            </button>
          ) : null}
        </div>
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit period" : "New period"}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              Period name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. 2026-Q1 or January 2026"
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
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update period"
                  : "Save period"}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {periods.length === 0
              ? "No fiscal periods defined yet."
              : "No periods match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Start</th>
                <th className="px-4 py-3 font-semibold">End</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.startDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.endDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.status === "open"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(p.id, p.status)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      {p.status === "open" ? "Close" : "Reopen"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="ml-3 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(p)}
                      className="ml-3 text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
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
