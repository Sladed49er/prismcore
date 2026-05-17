"use client";

import { useState, useTransition } from "react";
import { addCertificate } from "@/app/(shell)/m/certificates/actions";

export interface CertificateDTO {
  id: string;
  certNumber: string;
  holderName: string;
  policyNumber: string;
  clientName: string;
  issuedDate: string | null;
  status: string;
}

export interface PolicyOption {
  id: string;
  label: string;
}

const STYLE: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  issued: "bg-green-50 text-green-700",
  expired: "bg-gray-100 text-gray-500",
};

const EMPTY = {
  certNumber: "",
  holderName: "",
  issuedDate: "",
  status: "draft",
};

export function CertificatesPanel({
  certificates,
  policies,
}: {
  certificates: CertificateDTO[];
  policies: PolicyOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [policyId, setPolicyId] = useState("");
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addCertificate({
        policyId,
        certNumber: form.certNumber,
        holderName: form.holderName,
        issuedDate: form.issuedDate,
        status: form.status as "draft" | "issued" | "expired",
      });
      setForm({ ...EMPTY });
      setPolicyId("");
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
          {certificates.length} certificate
          {certificates.length === 1 ? "" : "s"}
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New certificate
          </button>
        ) : null}
      </div>

      {policies.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a policy first — a certificate is issued against a policy.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Policy
              <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a policy…</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Certificate holder
              <input
                value={form.holderName}
                onChange={(e) => set("holderName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Certificate number
              <input
                value={form.certNumber}
                onChange={(e) => set("certNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Issued date
              <input
                type="date"
                value={form.issuedDate}
                onChange={(e) => set("issuedDate", e.target.value)}
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
                <option value="draft">draft</option>
                <option value="issued">issued</option>
                <option value="expired">expired</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !policyId || !form.holderName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save certificate"}
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
        {certificates.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No certificates yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Holder</th>
                <th className="px-4 py-3 font-semibold">Cert #</th>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Insured</th>
                <th className="px-4 py-3 font-semibold">Issued</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {certificates.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.holderName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.certNumber || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{c.clientName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.issuedDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {c.status}
                    </span>
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
