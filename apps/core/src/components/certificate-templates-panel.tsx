"use client";

import { useState, useTransition } from "react";
import {
  newCertificateTemplate,
  updateCertificateTemplateStatus,
} from "@/app/(shell)/m/certificates/templates/actions";

export interface CertificateTemplateDTO {
  id: string;
  name: string;
  description: string;
  coverageSummary: string;
  status: "draft" | "published" | "archived";
}

const STATUS_COLOR: Record<CertificateTemplateDTO["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-amber-50 text-amber-700",
};

const EMPTY = { name: "", description: "", coverageSummary: "" };

export function CertificateTemplatesPanel({
  templates,
}: {
  templates: CertificateTemplateDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newCertificateTemplate(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: CertificateTemplateDTO["status"],
  ): void {
    startTransition(async () => {
      await updateCertificateTemplateStatus({ id, status });
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
          <div className="grid gap-3">
            <label className={labelClass}>
              Template name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Description
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Coverage summary
              <textarea
                value={form.coverageSummary}
                onChange={(e) => set("coverageSummary", e.target.value)}
                rows={3}
                placeholder="e.g. GL $1M/$2M, Auto $1M, Umbrella $5M"
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
            No certificate templates yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Template</th>
                <th className="px-4 py-3 font-semibold">Coverage summary</th>
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
                  <td className="px-4 py-3 text-gray-500">
                    {t.coverageSummary || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          t.id,
                          e.target.value as CertificateTemplateDTO["status"],
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
