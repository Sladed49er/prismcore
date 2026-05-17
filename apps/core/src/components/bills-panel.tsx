"use client";

import { useState, useTransition } from "react";
import {
  addBill,
  payBill,
  editBill,
  removeBill,
} from "@/app/(shell)/m/accounting/bills/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";
import type { StatusOption } from "@/lib/status-options";
import { badgeClass } from "@/lib/badge-colors";

export interface BillDTO {
  id: string;
  vendorId: string;
  billNumber: string;
  vendorName: string;
  billDate: string | null;
  dueDate: string | null;
  amountCents: number;
  amountPaidCents: number;
  balanceCents: number;
  memo: string;
  status: string;
}

export interface VendorOption {
  id: string;
  name: string;
}

export const STATUS_DEFAULTS: StatusOption[] = [
  { value: "pending", label: "Pending", color: "amber" },
  { value: "partial", label: "Partial", color: "blue" },
  { value: "paid", label: "Paid", color: "green" },
  { value: "void", label: "Void", color: "red" },
];

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  billNumber: "",
  billDate: "",
  dueDate: "",
  amountDollars: "",
  memo: "",
};

const CSV_COLUMNS: CsvColumn<BillDTO>[] = [
  { header: "Bill #", cell: (b) => b.billNumber },
  { header: "Vendor", cell: (b) => b.vendorName },
  { header: "Bill date", cell: (b) => b.billDate },
  { header: "Due date", cell: (b) => b.dueDate },
  { header: "Amount", cell: (b) => (b.amountCents / 100).toFixed(2) },
  { header: "Paid", cell: (b) => (b.amountPaidCents / 100).toFixed(2) },
  { header: "Balance", cell: (b) => (b.balanceCents / 100).toFixed(2) },
  { header: "Memo", cell: (b) => b.memo },
  { header: "Status", cell: (b) => b.status },
];

export function BillsPanel({
  bills,
  vendors,
  statusOptions,
}: {
  bills: BillDTO[];
  vendors: VendorOption[];
  statusOptions: StatusOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState("");
  const [form, setForm] = useState({ ...EMPTY });
  const [query, setQuery] = useState("");

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startCreate(): void {
    setForm({ ...EMPTY });
    setVendorId("");
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(b: BillDTO): void {
    setForm({
      billNumber: b.billNumber,
      billDate: b.billDate ?? "",
      dueDate: b.dueDate ?? "",
      amountDollars: String(b.amountCents / 100),
      memo: b.memo,
    });
    setVendorId(b.vendorId);
    setEditingId(b.id);
    setShowForm(true);
  }

  function close(): void {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY });
    setVendorId("");
  }

  function submit(): void {
    startTransition(async () => {
      const payload = {
        vendorId,
        billNumber: form.billNumber,
        billDate: form.billDate,
        dueDate: form.dueDate,
        amountDollars: form.amountDollars,
        memo: form.memo,
      };
      if (editingId) {
        await editBill({ id: editingId, ...payload });
      } else {
        await addBill(payload);
      }
      close();
    });
  }

  function pay(billId: string, balanceCents: number): void {
    startTransition(async () => {
      await payBill(billId, String(balanceCents / 100));
    });
  }

  function remove(b: BillDTO): void {
    if (!confirm(`Delete bill ${b.billNumber}? This cannot be undone.`))
      return;
    startTransition(async () => {
      await removeBill(b.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? bills.filter((b) =>
        [b.billNumber, b.vendorName, b.memo, b.status]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : bills;

  const owed = bills
    .filter((b) => b.status !== "void")
    .reduce((sum, b) => sum + b.balanceCents, 0);
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
            placeholder="Search bills…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() => exportRowsToCsv("bills", CSV_COLUMNS, visible)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {money(owed)} payable
          </span>
          {!showForm && vendors.length > 0 ? (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              + New bill
            </button>
          ) : null}
        </div>
      </div>

      {vendors.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a vendor first — a bill is owed to a vendor.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit bill" : "New bill"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Vendor
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Bill number
              <input
                value={form.billNumber}
                onChange={(e) => set("billNumber", e.target.value)}
                className={inputClass}
              />
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
              Bill date
              <input
                type="date"
                value={form.billDate}
                onChange={(e) => set("billDate", e.target.value)}
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
            <label className={`${labelClass} sm:col-span-2`}>
              Memo
              <input
                value={form.memo}
                onChange={(e) => set("memo", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !vendorId || !form.billNumber.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update bill"
                  : "Save bill"}
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
            {bills.length === 0
              ? "No bills yet."
              : "No bills match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Bill #</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">{b.billNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{b.vendorName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(b.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(b.balanceCents)}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const option = statusOptions.find(
                        (o) => o.value === b.status,
                      );
                      return (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(option?.color ?? "gray")}`}
                        >
                          {option?.label ?? b.status}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {b.balanceCents > 0 && b.status !== "void" ? (
                      <button
                        type="button"
                        onClick={() => pay(b.id, b.balanceCents)}
                        disabled={pending}
                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 disabled:opacity-40"
                      >
                        Pay balance
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="ml-3 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(b)}
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
