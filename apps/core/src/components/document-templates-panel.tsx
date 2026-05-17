"use client";

import { useState, useTransition } from "react";
import {
  newDocumentTemplate,
  updateTemplateStatus,
} from "@/app/(shell)/m/documents/templates/actions";

export interface DocumentTemplateDTO {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "draft" | "published" | "archived";
}

const STATUS_COLOR: Record<DocumentTemplateDTO["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-amber-50 text-amber-700",
};

const EMPTY = { name: "", category: "", description: "", body: "" };

export function DocumentTemplatesPanel({
  templates,
}: {
  templates: DocumentTemplateDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newDocumentTemplate(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: DocumentTemplateDTO["status"],
  ): void {
    startTransition(async () => {
      await updateTemplateStatus({ id, status });
    });
  }

  const published = templates.filter((t) => t.status === "published").length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {templates.length} template{templates.length === 1 ? "" : "s"} ·{" "}
          {published} published
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New template
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Template name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Category
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Proposals, Letters"
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Body
              <textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={4}
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
              {pending ? "Saving…" : "Save template"}
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
        {templates.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No document templates yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Template</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{t.name}</span>
                    {t.description ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {t.description}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.category}</td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          t.id,
                          e.target.value as DocumentTemplateDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[t.status]}`}
                    >
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                      <option value="archived">archived</option>
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
