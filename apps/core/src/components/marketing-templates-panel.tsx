"use client";

import { useState, useTransition } from "react";
import {
  addTemplate,
  editTemplate,
  removeTemplate,
} from "@/app/(shell)/m/marketing/templates/actions";

export interface TemplateDTO {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function MarketingTemplatesPanel({
  templates,
}: {
  templates: TemplateDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function startEdit(t: TemplateDTO): void {
    setEditId(t.id);
    setShowNew(false);
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
  }
  function startNew(): void {
    setEditId(null);
    setShowNew(true);
    setName("");
    setSubject("");
    setBody("");
  }
  function reset(): void {
    setEditId(null);
    setShowNew(false);
  }

  function save(): void {
    if (!name.trim()) return;
    startTransition(async () => {
      if (editId) await editTemplate({ id: editId, name, subject, body });
      else await addTemplate({ name, subject, body });
      reset();
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this template?")) return;
    startTransition(async () => {
      await removeTemplate(id);
    });
  }

  const editing = showNew || editId !== null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {templates.length} template{templates.length === 1 ? "" : "s"}
        </p>
        {!editing ? (
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New template
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3">
            <label className={labelClass}>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Subject
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Body (HTML — use {"{{name}}"} and {"{{first_name}}"} for merge
              fields)
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className={`${inputClass} font-mono`}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save template"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        {templates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No templates yet.
          </p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3"
            >
              <span>
                <span className="font-medium">{t.name}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {t.subject || "(no subject)"}
                </span>
              </span>
              <span className="flex gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  disabled={pending}
                  className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                >
                  Delete
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
