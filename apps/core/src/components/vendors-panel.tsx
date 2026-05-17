"use client";

import { useState, useTransition } from "react";
import { addVendor } from "@/app/(shell)/m/accounting/vendors/actions";

export interface VendorDTO {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  paymentTerms: string;
  is1099: boolean;
}

const TYPES = ["carrier", "supplier", "service", "other"] as const;
type Type = (typeof TYPES)[number];

const EMPTY = {
  name: "",
  type: "supplier",
  email: "",
  phone: "",
  paymentTerms: "Net 30",
  is1099: false,
};

export function VendorsPanel({ vendors }: { vendors: VendorDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function submit(): void {
    startTransition(async () => {
      await addVendor({
        name: form.name,
        type: form.type as Type,
        email: form.email,
        phone: form.phone,
        paymentTerms: form.paymentTerms,
        is1099: form.is1099,
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {vendors.length} vendor{vendors.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New vendor
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Vendor name
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Type
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
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
              Email
              <input
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Payment terms
              <input
                value={form.paymentTerms}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentTerms: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.is1099}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is1099: e.target.checked }))
                }
              />
              1099 vendor
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save vendor"}
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
        {vendors.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No vendors yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Terms</th>
                <th className="px-4 py-3 font-semibold">1099</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-gray-500">{v.type}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.email || v.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{v.paymentTerms}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.is1099 ? "Yes" : "—"}
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
