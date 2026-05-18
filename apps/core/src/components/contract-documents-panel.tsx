"use client";

import { useState, useTransition } from "react";
import {
  newDocument,
  removeDocument,
  type ContractDocumentForm,
} from "@/app/(shell)/m/contracts/actions";

export interface ContractDocumentDTO {
  id: string;
  contractLabel: string;
  name: string;
  docType: string;
  url: string;
  notes: string;
}

export interface ContractOption {
  id: string;
  name: string;
}

const EMPTY: ContractDocumentForm = {
  contractId: "",
  name: "",
  docType: "agreement",
  url: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function ContractDocumentsPanel({
  documents,
  contracts,
}: {
  documents: ContractDocumentDTO[];
  contracts: ContractOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ContractDocumentForm>({ ...EMPTY });

  function set<K extends keyof ContractDocumentForm>(
    key: K,
    value: ContractDocumentForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newDocument(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeDocument(id);
    });
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {documents.length} document{documents.length === 1 ? "" : "s"}
        </p>
        {!showForm && contracts.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + Attach a document
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Contract
              <select
                value={form.contractId}
                onChange={(e) => set("contractId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a contract…</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Document name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Type
              <input
                value={form.docType}
                onChange={(e) => set("docType", e.target.value)}
                placeholder="agreement · amendment · invoice · coi"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Link
              <input
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://…"
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
              disabled={pending || !form.contractId || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Attach document"}
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
            {contracts.length === 0
              ? "Add a contract first, then attach its documents."
              : "No documents attached yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Document</th>
                <th className="px-4 py-3 font-semibold">Contract</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((d) => (
                <tr key={d.id} className="align-top">
                  <td className="px-4 py-3">
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {d.name}
                      </a>
                    ) : (
                      <span className="font-medium">{d.name}</span>
                    )}
                    {d.notes ? (
                      <span className="block text-xs text-gray-400">
                        {d.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.contractLabel}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.docType}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(d.id)}
                      disabled={pending}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800"
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
