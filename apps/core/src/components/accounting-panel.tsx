"use client";

import { useState, useTransition } from "react";
import { addInvoice, advanceInvoice } from "@/app/(shell)/m/accounting/actions";

export interface InvoiceDTO {
  id: string;
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

const STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  sent: "bg-blue-50 text-blue-700",
  paid: "bg-green-50 text-green-700",
  void: "bg-red-50 text-red-700",
};

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

export function AccountingPanel({
  invoices,
  clients,
}: {
  invoices: InvoiceDTO[];
  clients: ClientOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addInvoice({
        clientId,
        invoiceNumber: form.invoiceNumber,
        description: form.description,
        amountDollars: form.amountDollars,
        status: form.status as Status,
        dueDate: form.dueDate,
      });
      setForm({ ...EMPTY });
      setClientId("");
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: Status): void {
    startTransition(async () => {
      await advanceInvoice(id, status);
    });
  }

  const outstanding = invoices
    .filter((i) => i.status === "sent")
    .reduce((sum, i) => sum + i.amountCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {invoices.length} invoice{invoices.length === 1 ? "" : "s"} ·{" "}
          {money(outstanding)} outstanding
        </p>
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New invoice
          </button>
        ) : null}
      </div>

      {clients.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a client first — every invoice is billed to a client.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
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
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
              {pending ? "Saving…" : "Save invoice"}
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
        {invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No invoices yet.
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium">{i.invoiceNumber}</td>
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
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STYLE[i.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
