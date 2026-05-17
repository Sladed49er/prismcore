"use client";

import { useState, useTransition } from "react";
import { newCertificateHolder } from "@/app/(shell)/m/certificates/holders/actions";

export interface CertificateHolderDTO {
  id: string;
  name: string;
  address: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}

const EMPTY = {
  name: "",
  address: "",
  contactName: "",
  email: "",
  phone: "",
  notes: "",
};

export function CertificateHoldersPanel({
  holders,
}: {
  holders: CertificateHolderDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newCertificateHolder(form);
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
          {holders.length} holder{holders.length === 1 ? "" : "s"} on file
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New holder
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Holder name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contact name
              <input
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Address
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Notes
              <input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save holder"}
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
        {holders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No certificate holders yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Holder</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Reach</th>
                <th className="px-4 py-3 font-semibold">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {holders.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {h.contactName || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {h.email || h.phone ? (
                      <>
                        {h.email}
                        {h.email && h.phone ? " · " : ""}
                        {h.phone}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {h.address || "—"}
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
