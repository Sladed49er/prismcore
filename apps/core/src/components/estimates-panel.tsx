"use client";

import { useState, useTransition } from "react";
import {
  addEstimate,
  advanceEstimate,
  editEstimate,
  removeEstimate,
} from "@/app/(shell)/m/accounting/estimates/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";
import type { StatusOption } from "@/lib/status-options";
import { badgeClass } from "@/lib/badge-colors";

export interface EstimateDTO {
  id: string;
  clientId: string;
  estimateNumber: string;
  clientName: string;
  description: string;
  amountCents: number;
  status: string;
  validUntil: string | null;
}

export interface ClientOption {
  id: string;
  name: string;
}

const STATUSES = [
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "converted",
] as const;
type Status = (typeof STATUSES)[number];

export const STATUS_DEFAULTS: StatusOption[] = [
  { value: "draft", label: "Draft", color: "gray" },
  { value: "sent", label: "Sent", color: "blue" },
  { value: "accepted", label: "Accepted", color: "green" },
  { value: "declined", label: "Declined", color: "red" },
  { value: "expired", label: "Expired", color: "gray" },
  { value: "converted", label: "Converted", color: "indigo" },
];

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  estimateNumber: "",
  description: "",
  amountDollars: "",
  status: "draft",
  validUntil: "",
};

const CSV_COLUMNS: CsvColumn<EstimateDTO>[] = [
  { header: "Estimate #", cell: (e) => e.estimateNumber },
  { header: "Client", cell: (e) => e.clientName },
  { header: "Description", cell: (e) => e.description },
  { header: "Amount", cell: (e) => (e.amountCents / 100).toFixed(2) },
  { header: "Valid until", cell: (e) => e.validUntil },
  { header: "Status", cell: (e) => e.status },
];

export function EstimatesPanel({
  estimates,
  clients,
  statusOptions,
}: {
  estimates: EstimateDTO[];
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

  function startEdit(e: EstimateDTO): void {
    setForm({
      estimateNumber: e.estimateNumber,
      description: e.description,
      amountDollars: String(e.amountCents / 100),
      status: e.status,
      validUntil: e.validUntil ?? "",
    });
    setClientId(e.clientId);
    setEditingId(e.id);
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
        estimateNumber: form.estimateNumber,
        description: form.description,
        amountDollars: form.amountDollars,
        status: form.status as Status,
        validUntil: form.validUntil,
      };
      if (editingId) {
        await editEstimate({ id: editingId, ...payload });
      } else {
        await addEstimate(payload);
      }
      close();
    });
  }

  function changeStatus(id: string, status: Status): void {
    startTransition(async () => {
      await advanceEstimate(id, status);
    });
  }

  function remove(e: EstimateDTO): void {
    if (!confirm(`Delete estimate ${e.estimateNumber}? This cannot be undone.`))
      return;
    startTransition(async () => {
      await removeEstimate(e.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? estimates.filter((e) =>
        [e.estimateNumber, e.clientName, e.description, e.status]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : estimates;

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
            placeholder="Search estimates…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() => exportRowsToCsv("estimates", CSV_COLUMNS, visible)}
          />
        </div>
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New estimate
          </button>
        ) : null}
      </div>

      {clients.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a client first — an estimate is issued to a client.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit estimate" : "New estimate"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Client
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
              Estimate number
              <input
                value={form.estimateNumber}
                onChange={(e) => set("estimateNumber", e.target.value)}
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
              Valid until
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
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
              disabled={pending || !clientId || !form.estimateNumber.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update estimate"
                  : "Save estimate"}
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
            {estimates.length === 0
              ? "No estimates yet."
              : "No estimates match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Estimate #</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Valid until</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium">
                    {e.estimateNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.clientName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(e.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.validUntil ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={e.status}
                      onChange={(ev) =>
                        changeStatus(e.id, ev.target.value as Status)
                      }
                      disabled={pending}
                      aria-label="Estimate status"
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${badgeClass(
                        statusOptions.find((o) => o.value === e.status)
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
