"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
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
import {
  SavedViewBar,
  type SavedViewItem,
  type SavedViewConfig,
} from "@/components/saved-view-bar";

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

/** A renderable, sortable column on the invoices list. */
interface InvoiceColumn {
  key: string;
  label: string;
  sortValue: (i: InvoiceDTO) => string;
  cell: (i: InvoiceDTO) => ReactNode;
}

const ALL_COLUMN_KEYS = [
  "invoiceNumber",
  "client",
  "description",
  "amount",
  "due",
  "status",
];

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
  savedViews,
}: {
  invoices: InvoiceDTO[];
  clients: ClientOption[];
  statusOptions: StatusOption[];
  savedViews: SavedViewItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState({ ...EMPTY });

  // ── List-view state, seeded from the tenant's default saved view ────────
  const defaultView = savedViews.find((v) => v.isDefault);
  const [query, setQuery] = useState(defaultView?.config.filters?.query ?? "");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    defaultView?.config.columns?.length
      ? defaultView.config.columns
      : ALL_COLUMN_KEYS,
  );
  const [sortBy, setSortBy] = useState<string | null>(
    defaultView?.config.sortBy ?? null,
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    defaultView?.config.sortDir ?? "asc",
  );

  function applyView(config: SavedViewConfig): void {
    setVisibleColumns(
      config.columns?.length ? config.columns : ALL_COLUMN_KEYS,
    );
    setSortBy(config.sortBy ?? null);
    setSortDir(config.sortDir ?? "asc");
    setQuery(config.filters?.query ?? "");
  }

  function toggleSort(key: string): void {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

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

  const columns: InvoiceColumn[] = useMemo(
    () => [
      {
        key: "invoiceNumber",
        label: "Invoice #",
        sortValue: (i) => i.invoiceNumber.toLowerCase(),
        cell: (i) => <span className="font-medium">{i.invoiceNumber}</span>,
      },
      {
        key: "client",
        label: "Client",
        sortValue: (i) => i.clientName.toLowerCase(),
        cell: (i) => <span className="text-gray-600">{i.clientName}</span>,
      },
      {
        key: "description",
        label: "Description",
        sortValue: (i) => i.description.toLowerCase(),
        cell: (i) => <span className="text-gray-600">{i.description}</span>,
      },
      {
        key: "amount",
        label: "Amount",
        sortValue: (i) => String(i.amountCents).padStart(16, "0"),
        cell: (i) => (
          <span className="text-gray-600">{money(i.amountCents)}</span>
        ),
      },
      {
        key: "due",
        label: "Due",
        sortValue: (i) => i.dueDate ?? "",
        cell: (i) => <span className="text-gray-500">{i.dueDate ?? "—"}</span>,
      },
      {
        key: "status",
        label: "Status",
        sortValue: (i) => i.status,
        cell: (i) => (
          <select
            value={i.status}
            onChange={(e) => changeStatus(i.id, e.target.value as Status)}
            disabled={pending}
            aria-label="Invoice status"
            className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${badgeClass(
              statusOptions.find((o) => o.value === i.status)?.color ?? "gray",
            )}`}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ),
      },
    ],
    [statusOptions, pending],
  );

  function remove(i: InvoiceDTO): void {
    if (!confirm(`Delete invoice ${i.invoiceNumber}? This cannot be undone.`))
      return;
    startTransition(async () => {
      await removeInvoice(i.id);
    });
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? invoices.filter((i) =>
        [i.invoiceNumber, i.clientName, i.description, i.status]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : invoices;

  const sortColumn = columns.find((c) => c.key === sortBy);
  const visible = sortColumn
    ? [...filtered].sort((a, b) => {
        const av = sortColumn.sortValue(a);
        const bv = sortColumn.sortValue(b);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const shownColumns = columns.filter((c) => visibleColumns.includes(c.key));

  const outstanding = invoices
    .filter((i) => i.status === "sent")
    .reduce((sum, i) => sum + i.amountCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <SavedViewBar
            listKey="invoices"
            columns={columns.map((c) => ({ key: c.key, label: c.label }))}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            query={query}
            onQueryChange={setQuery}
            sortBy={sortBy}
            sortDir={sortDir}
            savedViews={savedViews}
            onApplyView={applyView}
            searchPlaceholder="Search invoices…"
          />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm text-gray-500">
            {money(outstanding)} outstanding
          </span>
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() => exportRowsToCsv("invoices", CSV_COLUMNS, visible)}
          />
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
                {shownColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-gray-700"
                  >
                    {col.label}
                    {sortBy === col.key
                      ? sortDir === "asc"
                        ? " ▲"
                        : " ▼"
                      : ""}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((i) => (
                <tr key={i.id}>
                  {shownColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.cell(i)}
                    </td>
                  ))}
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
