"use client";

import { useState, useTransition } from "react";
import {
  addAccount,
  editAccount,
  removeAccount,
} from "@/app/(shell)/m/accounting/chart-of-accounts/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";

export interface AccountDTO {
  id: string;
  accountNumber: string;
  name: string;
  type: string;
  subtype: string;
  description: string;
  isActive: boolean;
}

const TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;
type Type = (typeof TYPES)[number];

const TYPE_STYLE: Record<string, string> = {
  asset: "bg-blue-50 text-blue-700",
  liability: "bg-amber-50 text-amber-700",
  equity: "bg-purple-50 text-purple-700",
  revenue: "bg-green-50 text-green-700",
  expense: "bg-red-50 text-red-700",
};

const EMPTY = {
  accountNumber: "",
  name: "",
  type: "asset",
  subtype: "",
  description: "",
};

const CSV_COLUMNS: CsvColumn<AccountDTO>[] = [
  { header: "Number", cell: (a) => a.accountNumber },
  { header: "Account", cell: (a) => a.name },
  { header: "Type", cell: (a) => a.type },
  { header: "Subtype", cell: (a) => a.subtype },
  { header: "Description", cell: (a) => a.description },
  { header: "Active", cell: (a) => (a.isActive ? "Yes" : "No") },
];

export function ChartOfAccountsPanel({
  accounts,
}: {
  accounts: AccountDTO[];
}) {
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

  function startEdit(a: AccountDTO): void {
    setForm({
      accountNumber: a.accountNumber,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      description: a.description,
    });
    setEditingId(a.id);
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
        await editAccount({
          id: editingId,
          ...form,
          type: form.type as Type,
        });
      } else {
        await addAccount({ ...form, type: form.type as Type });
      }
      close();
    });
  }

  function remove(a: AccountDTO): void {
    if (
      !confirm(
        `Delete account ${a.accountNumber} — ${a.name}? ` +
          `Accounts with posted journal lines cannot be deleted.`,
      )
    )
      return;
    startTransition(async () => {
      await removeAccount(a.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? accounts.filter((a) =>
        [a.accountNumber, a.name, a.type, a.subtype]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : accounts;

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
            placeholder="Search accounts…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() =>
              exportRowsToCsv("chart-of-accounts", CSV_COLUMNS, visible)
            }
          />
        </div>
        {!showForm ? (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New account
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit account" : "New account"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Account number
              <input
                value={form.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                placeholder="e.g. 1000"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Account name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Type
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Subtype
              <input
                value={form.subtype}
                onChange={(e) => set("subtype", e.target.value)}
                placeholder="e.g. Current Asset"
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
              disabled={
                pending || !form.accountNumber.trim() || !form.name.trim()
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update account"
                  : "Save account"}
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
            {accounts.length === 0
              ? "No accounts yet — add your chart of accounts above."
              : "No accounts match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Number</th>
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Subtype</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((a) => (
                <tr key={a.id} className={a.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {a.accountNumber}
                  </td>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[a.type] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.subtype || "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(a)}
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(a)}
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
