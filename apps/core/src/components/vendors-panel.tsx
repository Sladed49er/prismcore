"use client";

import { useState, useTransition } from "react";
import {
  addVendor,
  editVendor,
  removeVendor,
} from "@/app/(shell)/m/accounting/vendors/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";

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

const CSV_COLUMNS: CsvColumn<VendorDTO>[] = [
  { header: "Vendor", cell: (v) => v.name },
  { header: "Type", cell: (v) => v.type },
  { header: "Email", cell: (v) => v.email },
  { header: "Phone", cell: (v) => v.phone },
  { header: "Payment terms", cell: (v) => v.paymentTerms },
  { header: "1099", cell: (v) => (v.is1099 ? "Yes" : "No") },
];

export function VendorsPanel({ vendors }: { vendors: VendorDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [query, setQuery] = useState("");

  function startCreate(): void {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(v: VendorDTO): void {
    setForm({
      name: v.name,
      type: v.type,
      email: v.email,
      phone: v.phone,
      paymentTerms: v.paymentTerms,
      is1099: v.is1099,
    });
    setEditingId(v.id);
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
        name: form.name,
        type: form.type as Type,
        email: form.email,
        phone: form.phone,
        paymentTerms: form.paymentTerms,
        is1099: form.is1099,
      };
      if (editingId) {
        await editVendor({ id: editingId, ...payload });
      } else {
        await addVendor(payload);
      }
      close();
    });
  }

  function remove(v: VendorDTO): void {
    if (
      !confirm(
        `Delete vendor "${v.name}"? This also deletes the vendor's bills. ` +
          `This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      await removeVendor(v.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? vendors.filter((v) =>
        [v.name, v.type, v.email, v.phone]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : vendors;

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
            placeholder="Search vendors…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() => exportRowsToCsv("vendors", CSV_COLUMNS, visible)}
          />
        </div>
        {!showForm ? (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New vendor
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit vendor" : "New vendor"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Vendor name
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Type
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
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
              {pending
                ? "Saving…"
                : editingId
                  ? "Update vendor"
                  : "Save vendor"}
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
            {vendors.length === 0
              ? "No vendors yet."
              : "No vendors match your search."}
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
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-gray-500">{v.type}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.email || v.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.paymentTerms}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.is1099 ? "Yes" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(v)}
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(v)}
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
