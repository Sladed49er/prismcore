"use client";

import { useState, useTransition } from "react";
import {
  addTrustEntry,
  editTrustEntry,
  removeTrustEntry,
} from "@/app/(shell)/m/accounting/trust/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";

export interface TrustEntryDTO {
  id: string;
  entryType: string;
  amountCents: number;
  description: string;
  party: string;
  state: string;
  entryDate: string | null;
  runningBalanceCents: number;
}

const ENTRY_TYPES = [
  "premium_received",
  "remitted",
  "return",
  "fee",
] as const;
type EntryType = (typeof ENTRY_TYPES)[number];

const TYPE_LABEL: Record<string, string> = {
  premium_received: "Premium received",
  remitted: "Remitted to carrier",
  return: "Return to insured",
  fee: "Agency fee",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  entryType: "premium_received",
  amountDollars: "",
  description: "",
  party: "",
  state: "",
  entryDate: "",
};

const CSV_COLUMNS: CsvColumn<TrustEntryDTO>[] = [
  { header: "Date", cell: (e) => e.entryDate },
  { header: "Entry", cell: (e) => TYPE_LABEL[e.entryType] ?? e.entryType },
  { header: "Description", cell: (e) => e.description },
  { header: "Party", cell: (e) => e.party },
  { header: "State", cell: (e) => e.state },
  { header: "Amount", cell: (e) => (e.amountCents / 100).toFixed(2) },
  {
    header: "Balance",
    cell: (e) => (e.runningBalanceCents / 100).toFixed(2),
  },
];

export function TrustPanel({ entries }: { entries: TrustEntryDTO[] }) {
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

  function startEdit(e: TrustEntryDTO): void {
    setForm({
      entryType: e.entryType,
      amountDollars: String(e.amountCents / 100),
      description: e.description,
      party: e.party,
      state: e.state,
      entryDate: e.entryDate ?? "",
    });
    setEditingId(e.id);
    setShowForm(true);
  }

  function close(): void {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY });
  }

  function submit(): void {
    startTransition(async () => {
      const payload = {
        entryType: form.entryType as EntryType,
        amountDollars: form.amountDollars,
        description: form.description,
        party: form.party,
        state: form.state,
        entryDate: form.entryDate,
      };
      if (editingId) {
        await editTrustEntry({ id: editingId, ...payload });
      } else {
        await addTrustEntry(payload);
      }
      close();
    });
  }

  function remove(e: TrustEntryDTO): void {
    if (
      !confirm(
        `Delete this trust entry? The running balance will be recomputed.`,
      )
    )
      return;
    startTransition(async () => {
      await removeTrustEntry(e.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? entries.filter((e) =>
        [e.description, e.party, e.state, TYPE_LABEL[e.entryType] ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : entries;

  const balance =
    entries.length > 0
      ? (entries[entries.length - 1]?.runningBalanceCents ?? 0)
      : 0;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-4">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
            Trust balance
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {money(balance)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ledger…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() =>
              exportRowsToCsv("trust-ledger", CSV_COLUMNS, visible)
            }
          />
          {!showForm ? (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              + New ledger entry
            </button>
          ) : null}
        </div>
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit ledger entry" : "New ledger entry"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Entry type
              <select
                value={form.entryType}
                onChange={(e) => set("entryType", e.target.value)}
                className={inputClass}
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Amount ($)
              <input
                type="number"
                value={form.amountDollars}
                onChange={(e) => set("amountDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Party (insured / carrier)
              <input
                value={form.party}
                onChange={(e) => set("party", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              State
              <input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Date
              <input
                type="date"
                value={form.entryDate}
                onChange={(e) => set("entryDate", e.target.value)}
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
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.amountDollars.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update entry"
                  : "Record entry"}
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
            {entries.length === 0
              ? "No trust ledger entries yet."
              : "No entries match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Entry</th>
                <th className="px-4 py-3 font-semibold">Party</th>
                <th className="px-4 py-3 text-right font-semibold">In</th>
                <th className="px-4 py-3 text-right font-semibold">Out</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Balance
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((e) => {
                const isIn = e.entryType === "premium_received";
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-gray-500">
                      {e.entryDate ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {TYPE_LABEL[e.entryType] ?? e.entryType}
                      </span>
                      {e.description ? (
                        <span className="ml-2 text-xs text-gray-400">
                          {e.description}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {e.party || "—"}
                      {e.state ? (
                        <span className="ml-1 text-xs text-gray-400">
                          ({e.state})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      {isIn ? money(e.amountCents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {isIn ? "—" : money(e.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {money(e.runningBalanceCents)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(e)}
                        className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(e)}
                        className="ml-3 text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
