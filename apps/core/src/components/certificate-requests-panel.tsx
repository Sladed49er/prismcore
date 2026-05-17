"use client";

import { useState, useTransition } from "react";
import {
  newCertificateRequest,
  updateCertificateRequestStatus,
} from "@/app/(shell)/m/certificates/requests/actions";

export interface CertificateRequestDTO {
  id: string;
  holderName: string;
  requestedBy: string;
  policyReference: string;
  neededByDate: string | null;
  status: "open" | "issued" | "declined";
}

const STATUS_COLOR: Record<CertificateRequestDTO["status"], string> = {
  open: "bg-amber-50 text-amber-700",
  issued: "bg-emerald-50 text-emerald-700",
  declined: "bg-rose-50 text-rose-700",
};

const EMPTY = {
  holderName: "",
  requestedBy: "",
  policyReference: "",
  neededByDate: "",
  notes: "",
};

export function CertificateRequestsPanel({
  requests,
}: {
  requests: CertificateRequestDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newCertificateRequest(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: CertificateRequestDTO["status"],
  ): void {
    startTransition(async () => {
      await updateCertificateRequestStatus({ id, status });
    });
  }

  const open = requests.filter((r) => r.status === "open").length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {requests.length} request{requests.length === 1 ? "" : "s"} ·{" "}
          {open} open
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New request
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Holder name
              <input
                value={form.holderName}
                onChange={(e) => set("holderName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Requested by
              <input
                value={form.requestedBy}
                onChange={(e) => set("requestedBy", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Policy reference
              <input
                value={form.policyReference}
                onChange={(e) => set("policyReference", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Needed by
              <input
                type="date"
                value={form.neededByDate}
                onChange={(e) => set("neededByDate", e.target.value)}
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
              disabled={pending || !form.holderName.trim()}
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
            No certificate requests yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Holder</th>
                <th className="px-4 py-3 font-semibold">Requested by</th>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Needed by</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.holderName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.requestedBy || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.policyReference || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.neededByDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          r.id,
                          e.target.value as CertificateRequestDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status]}`}
                    >
                      <option value="open">open</option>
                      <option value="issued">issued</option>
                      <option value="declined">declined</option>
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
