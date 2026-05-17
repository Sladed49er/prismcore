"use client";

import { useState, useTransition } from "react";
import { newPolicyDocument } from "@/app/(shell)/m/policies/documents/actions";

export interface PolicyOption {
  id: string;
  label: string;
}

export interface PolicyDocumentDTO {
  id: string;
  policyNumber: string;
  documentType:
    | "id_card"
    | "dec_page"
    | "certificate"
    | "endorsement_copy"
    | "application"
    | "other";
  title: string;
  reference: string;
  issuedDate: string | null;
  notes: string;
}

const TYPE_LABEL: Record<PolicyDocumentDTO["documentType"], string> = {
  id_card: "ID card",
  dec_page: "Dec page",
  certificate: "Certificate",
  endorsement_copy: "Endorsement copy",
  application: "Application",
  other: "Other",
};

const EMPTY = {
  policyId: "",
  documentType: "id_card",
  title: "",
  reference: "",
  issuedDate: "",
  notes: "",
};

export function PolicyDocumentsPanel({
  documents,
  policies,
}: {
  documents: PolicyDocumentDTO[];
  policies: PolicyOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newPolicyDocument({
        ...form,
        documentType:
          form.documentType as PolicyDocumentDTO["documentType"],
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
          {documents.length} document{documents.length === 1 ? "" : "s"} on
          file
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Add document
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Policy
              <select
                value={form.policyId}
                onChange={(e) => set("policyId", e.target.value)}
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
              Document type
              <select
                value={form.documentType}
                onChange={(e) => set("documentType", e.target.value)}
                className={inputClass}
              >
                <option value="id_card">ID card</option>
                <option value="dec_page">Dec page</option>
                <option value="certificate">Certificate</option>
                <option value="endorsement_copy">Endorsement copy</option>
                <option value="application">Application</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className={labelClass}>
              Title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
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
            <label className={`${labelClass} sm:col-span-2`}>
              Reference (URL or document number)
              <input
                value={form.reference}
                onChange={(e) => set("reference", e.target.value)}
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
              disabled={pending || !form.policyId || !form.title.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save document"}
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
        {documents.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {policies.length === 0
              ? "Add a policy first, then attach its documents."
              : "No policy documents on file yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Issued</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium">{d.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[d.documentType]}
                  </td>
                  <td className="px-4 py-3">
                    <span>{d.title}</span>
                    {d.notes ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {d.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {d.issuedDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {d.reference || "—"}
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
