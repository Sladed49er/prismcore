"use client";

import { useState, useTransition } from "react";
import { addDocument } from "@/app/(shell)/m/documents/actions";

export interface DocumentDTO {
  id: string;
  name: string;
  category: string;
  notes: string;
}

export interface CustomFieldDTO {
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
}

const CATEGORIES = [
  "General",
  "Policy document",
  "ACORD form",
  "Correspondence",
  "Claim file",
  "Signed agreement",
];

export function DocumentsPanel({
  documents,
  customFields,
}: {
  documents: DocumentDTO[];
  customFields: CustomFieldDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [notes, setNotes] = useState("");
  const [custom, setCustom] = useState<Record<string, string>>({});

  function submit(): void {
    startTransition(async () => {
      await addDocument({ name, category, notes, customValues: custom });
      setName("");
      setCategory("General");
      setNotes("");
      setCustom({});
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
          {documents.length} document{documents.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New document
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </label>
          </div>
          {customFields.length > 0 ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Your custom fields
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {customFields.map((f) => (
                  <label key={f.fieldKey} className={labelClass}>
                    {f.label}
                    {f.required ? " *" : ""}
                    <input
                      type={
                        f.fieldType === "number"
                          ? "number"
                          : f.fieldType === "date"
                            ? "date"
                            : "text"
                      }
                      value={custom[f.fieldKey] ?? ""}
                      onChange={(e) =>
                        setCustom((c) => ({
                          ...c,
                          [f.fieldKey]: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !name.trim()}
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
            No documents yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.category}</td>
                  <td className="px-4 py-3 text-gray-500">{d.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
