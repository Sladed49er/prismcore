"use client";

import { useState, useTransition } from "react";
import {
  newQuarterlyTax,
  payQuarterlyTax,
  editQuarterlyTax,
  removeQuarterlyTax,
} from "@/app/(shell)/m/accounting/quarterly-taxes/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";

export interface QuarterlyTaxDTO {
  id: string;
  taxType: string;
  year: string;
  quarter: string;
  estimatedCents: number;
  paidCents: number;
  dueDate: string | null;
  status: "scheduled" | "paid";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  taxType: "",
  year: String(new Date().getFullYear()),
  quarter: "Q1",
  estimatedDollars: "",
  dueDate: "",
};

const CSV_COLUMNS: CsvColumn<QuarterlyTaxDTO>[] = [
  { header: "Tax type", cell: (r) => r.taxType },
  { header: "Year", cell: (r) => r.year },
  { header: "Quarter", cell: (r) => r.quarter },
  { header: "Due date", cell: (r) => r.dueDate },
  { header: "Estimated", cell: (r) => (r.estimatedCents / 100).toFixed(2) },
  { header: "Paid", cell: (r) => (r.paidCents / 100).toFixed(2) },
  { header: "Status", cell: (r) => r.status },
];

export function QuarterlyTaxesPanel({ rows }: { rows: QuarterlyTaxDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [payInput, setPayInput] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startCreate(): void {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(r: QuarterlyTaxDTO): void {
    setForm({
      taxType: r.taxType,
      year: r.year,
      quarter: r.quarter,
      estimatedDollars: String(r.estimatedCents / 100),
      dueDate: r.dueDate ?? "",
    });
    setEditingId(r.id);
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
        await editQuarterlyTax({ id: editingId, ...form });
      } else {
        await newQuarterlyTax(form);
      }
      close();
    });
  }

  function pay(id: string, fallback: number): void {
    const entered = payInput[id];
    const dollars =
      entered && entered.trim() ? entered : String(fallback / 100);
    startTransition(async () => {
      await payQuarterlyTax({ id, paidDollars: dollars });
    });
  }

  function remove(r: QuarterlyTaxDTO): void {
    if (!confirm(`Delete ${r.taxType} ${r.year} ${r.quarter}?`)) return;
    startTransition(async () => {
      await removeQuarterlyTax(r.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? rows.filter((r) =>
        [r.taxType, r.year, r.quarter].join(" ").toLowerCase().includes(q),
      )
    : rows;

  const scheduled = rows
    .filter((r) => r.status === "scheduled")
    .reduce((s, r) => s + r.estimatedCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search payments…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() =>
              exportRowsToCsv("quarterly-taxes", CSV_COLUMNS, visible)
            }
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {money(scheduled)} scheduled
          </span>
          {!showForm ? (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              + Schedule payment
            </button>
          ) : null}
        </div>
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit payment" : "Schedule payment"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Tax type
              <input
                value={form.taxType}
                onChange={(e) => set("taxType", e.target.value)}
                placeholder="e.g. Federal estimated"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Year
              <input
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Quarter
              <select
                value={form.quarter}
                onChange={(e) => set("quarter", e.target.value)}
                className={inputClass}
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </label>
            <label className={labelClass}>
              Estimated amount ($)
              <input
                type="number"
                value={form.estimatedDollars}
                onChange={(e) => set("estimatedDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Due date
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.taxType.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update payment"
                  : "Save payment"}
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
            {rows.length === 0
              ? "No quarterly tax payments scheduled yet."
              : "No payments match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Tax type</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Estimated</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.taxType}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.year} {r.quarter}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(r.estimatedCents)}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "paid" ? (
                      <span className="font-medium text-emerald-700">
                        {money(r.paidCents)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder={String(r.estimatedCents / 100)}
                          value={payInput[r.id] ?? ""}
                          onChange={(e) =>
                            setPayInput((p) => ({
                              ...p,
                              [r.id]: e.target.value,
                            }))
                          }
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => pay(r.id, r.estimatedCents)}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                        >
                          Mark paid
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(r)}
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
