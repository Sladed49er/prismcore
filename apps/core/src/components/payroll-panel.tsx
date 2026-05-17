"use client";

import { useState, useTransition } from "react";
import {
  newPayRun,
  postPayRun,
  editPayRun,
  removePayRun,
} from "@/app/(shell)/m/accounting/payroll/actions";

export interface PayRunDTO {
  id: string;
  label: string;
  payDate: string | null;
  status: string;
  totalGrossCents: number;
  totalNetCents: number;
  entryCount: number;
}

export interface PayRunEntryDTO {
  id: string;
  payRunId: string;
  employeeName: string;
  grossCents: number;
  taxCents: number;
  netCents: number;
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

export function PayrollPanel({
  runs,
  entries,
  employeeCount,
}: {
  runs: PayRunDTO[];
  entries: PayRunEntryDTO[];
  employeeCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [payDate, setPayDate] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function startCreate(): void {
    setLabel("");
    setPayDate("");
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(r: PayRunDTO): void {
    setLabel(r.label);
    setPayDate(r.payDate ?? "");
    setEditingId(r.id);
    setShowForm(true);
  }

  function close(): void {
    setShowForm(false);
    setEditingId(null);
    setLabel("");
    setPayDate("");
  }

  function submit(): void {
    startTransition(async () => {
      if (editingId) {
        await editPayRun({ id: editingId, label, payDate });
      } else {
        await newPayRun({ label, payDate });
      }
      close();
    });
  }

  function post(runId: string): void {
    startTransition(async () => {
      await postPayRun(runId);
    });
  }

  function remove(r: PayRunDTO): void {
    if (
      !confirm(
        `Delete pay run "${r.label}"? Its ${r.entryCount} employee ` +
          `entr${r.entryCount === 1 ? "y" : "ies"} are removed too.`,
      )
    )
      return;
    startTransition(async () => {
      await removePayRun(r.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? runs.filter((r) => r.label.toLowerCase().includes(q))
    : runs;

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
          placeholder="Search pay runs…"
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        {!showForm ? (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New pay run
          </button>
        ) : null}
      </div>

      {employeeCount === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add employees first — a pay run generates an entry for each active
          employee.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700">
            {editingId ? "Edit pay run" : "New pay run"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {editingId
              ? "Updates the period label and pay date. Employee entries are unchanged."
              : "A pay run generates an entry for every active employee — gross from their period pay, a withholding estimate, and net."}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Pay period label
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. May 1–15, 2026"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Pay date
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !label.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update pay run"
                  : "Generate pay run"}
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

      <div className="mt-5 space-y-3">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
            {runs.length === 0
              ? "No pay runs yet."
              : "No pay runs match your search."}
          </p>
        ) : (
          visible.map((r) => {
            const isOpen = openId === r.id;
            const runEntries = entries.filter((e) => e.payRunId === r.id);
            return (
              <div
                key={r.id}
                className="rounded-xl border border-gray-200 bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : r.id)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="font-medium">{r.label}</span>
                    <span className="text-xs text-gray-400">
                      {r.payDate ?? "—"} · {r.entryCount} employee
                      {r.entryCount === 1 ? "" : "s"}
                    </span>
                  </button>
                  <span className="text-sm text-gray-600">
                    {money(r.totalNetCents)} net
                  </span>
                  {r.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => post(r.id)}
                      disabled={pending}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 disabled:opacity-40"
                    >
                      Post run
                    </button>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      posted
                    </span>
                  )}
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
                    className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
                {isOpen ? (
                  <table className="w-full border-t border-gray-100 text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-5 py-2 font-semibold">Employee</th>
                        <th className="px-5 py-2 font-semibold">Gross</th>
                        <th className="px-5 py-2 font-semibold">Tax</th>
                        <th className="px-5 py-2 font-semibold">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {runEntries.map((e) => (
                        <tr key={e.id}>
                          <td className="px-5 py-2 font-medium">
                            {e.employeeName}
                          </td>
                          <td className="px-5 py-2 text-gray-600">
                            {money(e.grossCents)}
                          </td>
                          <td className="px-5 py-2 text-gray-500">
                            {money(e.taxCents)}
                          </td>
                          <td className="px-5 py-2 text-gray-900">
                            {money(e.netCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
