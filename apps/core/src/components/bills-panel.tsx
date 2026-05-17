"use client";

import { useState, useTransition } from "react";
import { addBill, payBill } from "@/app/(shell)/m/accounting/bills/actions";

export interface BillDTO {
  id: string;
  billNumber: string;
  vendorName: string;
  dueDate: string | null;
  amountCents: number;
  amountPaidCents: number;
  balanceCents: number;
  status: string;
}

export interface VendorOption {
  id: string;
  name: string;
}

const STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  partial: "bg-blue-50 text-blue-700",
  paid: "bg-green-50 text-green-700",
  void: "bg-red-50 text-red-700",
};

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

export function BillsPanel({
  bills,
  vendors,
}: {
  bills: BillDTO[];
  vendors: VendorOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addBill({
        vendorId,
        billNumber: form.billNumber,
        billDate: form.billDate,
        dueDate: form.dueDate,
        amountDollars: form.amountDollars,
        memo: form.memo,
      });
      setForm({ ...EMPTY });
      setVendorId("");
      setShowForm(false);
    });
  }

  function pay(billId: string, balanceCents: number): void {
    startTransition(async () => {
      await payBill(billId, String(balanceCents / 100));
    });
  }

  const owed = bills
    .filter((b) => b.status !== "void")
    .reduce((sum, b) => sum + b.balanceCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {bills.length} bill{bills.length === 1 ? "" : "s"} · {money(owed)}{" "}
          payable
        </p>
        {!showForm && vendors.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New bill
          </button>
        ) : null}
      </div>

      {vendors.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a vendor first — a bill is owed to a vendor.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
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
              {pending ? "Saving…" : "Save bill"}
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
        {bills.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No bills yet.
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
              {bills.map((b) => (
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[b.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
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
