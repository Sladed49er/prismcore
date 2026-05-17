"use client";

import { useState, useTransition } from "react";
import {
  addSignatureRequest,
  advanceEsign,
} from "@/app/(shell)/m/esign/actions";

export interface SignatureRequestDTO {
  id: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  status: string;
  sentDate: string | null;
}

const STATUSES = ["draft", "sent", "signed", "declined"] as const;
type Status = (typeof STATUSES)[number];

const STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  sent: "bg-blue-50 text-blue-700",
  signed: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
};

const EMPTY = {
  documentName: "",
  signerName: "",
  signerEmail: "",
  status: "draft",
  sentDate: "",
};

export function EsignPanel({
  requests,
}: {
  requests: SignatureRequestDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addSignatureRequest({
        documentName: form.documentName,
        signerName: form.signerName,
        signerEmail: form.signerEmail,
        status: form.status as Status,
        sentDate: form.sentDate,
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: Status): void {
    startTransition(async () => {
      await advanceEsign(id, status);
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
          {requests.length} request{requests.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New signature request
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Document
              <input
                value={form.documentName}
                onChange={(e) => set("documentName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Signer name
              <input
                value={form.signerName}
                onChange={(e) => set("signerName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Signer email
              <input
                value={form.signerEmail}
                onChange={(e) => set("signerEmail", e.target.value)}
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
              Sent date
              <input
                type="date"
                value={form.sentDate}
                onChange={(e) => set("sentDate", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={
                pending ||
                !form.documentName.trim() ||
                !form.signerName.trim()
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save request"}
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
        {requests.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No signature requests yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Document</th>
                <th className="px-4 py-3 font-semibold">Signer</th>
                <th className="px-4 py-3 font-semibold">Sent</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.documentName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.signerName}
                    {r.signerEmail ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {r.signerEmail}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.sentDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      onChange={(e) =>
                        changeStatus(r.id, e.target.value as Status)
                      }
                      disabled={pending}
                      aria-label="Signature request status"
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STYLE[r.status] ?? "bg-gray-100 text-gray-500"}`}
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
