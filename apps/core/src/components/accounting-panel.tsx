"use client";

import { useState, useTransition } from "react";
import {
  addInvoice,
  advanceInvoice,
  editInvoice,
  removeInvoice,
} from "@/app/(shell)/m/accounting/invoices/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";
import type { StatusOption } from "@/lib/status-options";
import { badgeClass } from "@/lib/badge-colors";

export interface InvoiceDTO {
  id: string;
  clientId: string;
  invoiceNumber: string;
  clientName: string;
  description: string;
  amountCents: number;
  status: string;
  dueDate: string | null;
}

export interface ClientOption {
  id: string;
  name: string;
}

const STATUSES = ["draft", "sent", "paid", "void"] as const;
type Status = (typeof STATUSES)[number];

export const STATUS_DEFAULTS: StatusOption[] = [
  { value: "draft", label: "Draft", color: "gray" },
  { value: "sent", label: "Sent", color: "blue" },
  { value: "paid", label: "Paid", color: "green" },
  { value: "void", label: "Void", color: "red" },
];

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  invoiceNumber: "",
  description: "",
  amountDollars: "",
  status: "draft",
  dueDate: "",
};

const CSV_COLUMNS: CsvColumn<InvoiceDTO>[] = [
  { header: "Invoice #", cell: (i) => i.invoiceNumber },
  { header: "Client", cell: (i) => i.clientName },
  { header: "Description", cell: (i) => i.description },
  { header: "Amount", cell: (i) => (i.amountCents / 100).toFixed(2) },
  { header: "Due", cell: (i) => i.dueDate },
  { header: "Status", cell: (i) => i.status },
];

export function AccountingPanel({
  invoices,
  clients,
  statusOptions,
}: {
  invoices: InvoiceDTO[];
  clients: ClientOption[];
  statusOptions: StatusOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState({ ...EMPTY });
  const [query, setQuery] = useState("");

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startCreate(): void {
    setForm({ ...EMPTY });
    setClientId("");
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(i: InvoiceDTO): void {
    setForm({
      invoiceNumber: i.invoiceNumber,
      description: i.description,
      amountDollars: String(i.amountCents / 100),
      status: i.status,
      dueDate: i.dueDate ?? "",
    });
    setClientId(i.clientId);
    setEditingId(i.id);
    setShowForm(true);
  }

  function close(): void {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY });
    setClientId("");
  }

  function submit(): void {
    startTransition(async () => {
      const payload = {
        clientId,
        invoiceNumber: form.invoiceNumber,
        description: form.description,
        amountDollars: form.amountDollars,
        status: form.status as Status,
        dueDate: form.dueDate,
      };
      if (editingId) {
        await editInvoice({ id: editingId, ...payload });
      } else {
        await addInvoice(payload);
      }
      close();
    });
  }

  function changeStatus(id: string, status: Status): void {
    startTransition(async () => {
      await advanceInvoice(id, status);
    });
  }

  function remove(i: InvoiceDTO): void {
    if (!confirm(`Delete invoice ${i.invoiceNumber}? This cannot be undone.`))
      return;
    startTransition(async () => {
      await removeInvoice(i.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? invoices.filter((i) =>
        [i.invoiceNumber, i.clientName, i.description, i.status]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : invoices;

  const outstanding = invoices
    .filter((i) => i.status === "sent")
    .reduce((sum, i) => sum + i.amountCents, 0);
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
            placeholder="Search invoices…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() => exportRowsToCsv("invoices", CSV_COLUMNS, visible)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {money(outstanding)} outstanding
          </span>
          {!showForm && clients.length > 0 ? (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              + New invoice
            </button>
          ) : null}
        </div>
      </div>

      {clients.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a client first — every invoice is billed to a client.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit invoice" : "New invoice"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Bill to (client)
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Invoice number
              <input
                value={form.invoiceNumber}
                onChange={(e) => set("invoiceNumber", e.target.value)}
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
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
              disabled={pending || !clientId || !form.invoiceNumber.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update invoice"
                  : "Save invoice"}
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
            {invoices.length === 0
              ? "No invoices yet."
              : "No invoices match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice #</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium">
                    {i.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{i.clientName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(i.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {i.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={i.status}
                      onChange={(e) =>
                        changeStatus(i.id, e.target.value as Status)
                      }
                      disabled={pending}
                      aria-label="Invoice status"
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${badgeClass(
                        statusOptions.find((o) => o.value === i.status)
                          ?.color ?? "gray",
                      )}`}
                    >
                      {statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(i)}
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(i)}
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
