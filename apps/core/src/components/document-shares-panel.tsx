"use client";

import { useState, useTransition } from "react";
import {
  newDocumentShare,
  updateShareStatus,
} from "@/app/(shell)/m/documents/shares/actions";

export interface DocumentOption {
  id: string;
  label: string;
}

export interface DocumentShareDTO {
  id: string;
  documentName: string;
  label: string;
  recipient: string;
  expiresDate: string | null;
  status: "active" | "expired" | "revoked";
}

const STATUS_COLOR: Record<DocumentShareDTO["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  expired: "bg-amber-50 text-amber-700",
  revoked: "bg-rose-50 text-rose-700",
};

const EMPTY = {
  documentId: "",
  label: "",
  recipient: "",
  expiresDate: "",
  notes: "",
};

export function DocumentSharesPanel({
  shares,
  documents,
}: {
  shares: DocumentShareDTO[];
  documents: DocumentOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newDocumentShare(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: DocumentShareDTO["status"]): void {
    startTransition(async () => {
      await updateShareStatus({ id, status });
    });
  }

  const active = shares.filter((s) => s.status === "active").length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {shares.length} share{shares.length === 1 ? "" : "s"} · {active}{" "}
          active
        </p>
        {!showForm && documents.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New share link
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Document
              <select
                value={form.documentId}
                onChange={(e) => set("documentId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a document…</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Recipient
              <input
                value={form.recipient}
                onChange={(e) => set("recipient", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Link label
              <input
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Expires
              <input
                type="date"
                value={form.expiresDate}
                onChange={(e) => set("expiresDate", e.target.value)}
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
              disabled={pending || !form.documentId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Create share link"}
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
        {shares.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {documents.length === 0
              ? "Add a document to the library first, then share it."
              : "No share links yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Document</th>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shares.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{s.documentName}</span>
                    {s.label ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {s.label}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.recipient || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.expiresDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={s.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          s.id,
                          e.target.value as DocumentShareDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[s.status]}`}
                    >
                      <option value="active">active</option>
                      <option value="expired">expired</option>
                      <option value="revoked">revoked</option>
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
