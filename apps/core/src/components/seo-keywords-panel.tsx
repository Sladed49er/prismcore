"use client";

import { useState, useTransition } from "react";
import {
  newKeyword,
  editKeyword,
  removeKeyword,
  generateDraft,
  type SeoKeywordForm,
} from "@/app/(shell)/m/seo_engine/actions";

export interface SeoKeywordDTO {
  id: string;
  phrase: string;
  cluster: string;
  intent: string;
  status: "tracked" | "paused";
  notes: string;
}

const INTENTS = [
  "informational",
  "commercial",
  "transactional",
  "navigational",
] as const;

const STATUS_COLOR: Record<SeoKeywordDTO["status"], string> = {
  tracked: "bg-emerald-50 text-emerald-700",
  paused: "bg-gray-100 text-gray-500",
};

const EMPTY: SeoKeywordForm = {
  phrase: "",
  cluster: "",
  intent: "informational",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function SeoKeywordsPanel({
  keywords,
}: {
  keywords: SeoKeywordDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SeoKeywordForm>({ ...EMPTY });
  const [notice, setNotice] = useState<string | null>(null);

  function set<K extends keyof SeoKeywordForm>(
    key: K,
    value: SeoKeywordForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(k: SeoKeywordDTO): void {
    setEditId(k.id);
    setForm({
      phrase: k.phrase,
      cluster: k.cluster,
      intent: k.intent,
      notes: k.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) {
        const current = keywords.find((k) => k.id === editId);
        await editKeyword({
          id: editId,
          status: current?.status ?? "tracked",
          ...form,
        });
      } else {
        await newKeyword(form);
      }
      setShowForm(false);
    });
  }

  function generate(id: string, phrase: string): void {
    setNotice(`Drafting an article for "${phrase}"…`);
    startTransition(async () => {
      const result = await generateDraft(id);
      setNotice(result.message);
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Keywords</h2>
          <p className="text-sm text-gray-500">
            Tracked terms, grouped into clusters. Generate drafts one article
            per keyword.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Add keyword
        </button>
      </div>

      {notice && (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          {notice}
        </p>
      )}

      {showForm && (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>Keyword phrase</span>
            <input
              className={inputClass}
              value={form.phrase}
              onChange={(e) => set("phrase", e.target.value)}
              placeholder="workers comp insurance montana"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Cluster</span>
            <input
              className={inputClass}
              value={form.cluster}
              onChange={(e) => set("cluster", e.target.value)}
              placeholder="workers comp"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Intent</span>
            <select
              className={inputClass}
              value={form.intent}
              onChange={(e) => set("intent", e.target.value)}
            >
              {INTENTS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Notes for the writer</span>
            <textarea
              className={inputClass}
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              onClick={submit}
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {editId ? "Save" : "Add"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 divide-y divide-gray-100">
        {keywords.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-400">
            No keywords yet — add the terms this site should rank for.
          </li>
        )}
        {keywords.map((k) => (
          <li key={k.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {k.phrase}
              </p>
              <p className="text-xs text-gray-500">
                {k.cluster || "no cluster"} · {k.intent}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[k.status]}`}
            >
              {k.status}
            </span>
            <button
              onClick={() => generate(k.id, k.phrase)}
              disabled={pending}
              className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              Generate draft
            </button>
            <button
              onClick={() => openEdit(k)}
              className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
            >
              Edit
            </button>
            <button
              onClick={() => startTransition(() => removeKeyword(k.id))}
              className="rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
