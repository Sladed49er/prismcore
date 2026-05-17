"use client";

import { useState, useTransition } from "react";
import { newClaimNote } from "@/app/(shell)/m/claims/diary/actions";

export interface ClaimOption {
  id: string;
  label: string;
}

export interface ClaimNoteDTO {
  id: string;
  claimNumber: string;
  noteDate: string | null;
  author: string;
  category: "diary" | "contact" | "coverage" | "investigation" | "other";
  body: string;
}

const CATEGORY_LABEL: Record<ClaimNoteDTO["category"], string> = {
  diary: "Diary",
  contact: "Contact",
  coverage: "Coverage",
  investigation: "Investigation",
  other: "Other",
};

const EMPTY = {
  claimId: "",
  noteDate: "",
  author: "",
  category: "diary",
  body: "",
};

export function ClaimDiaryPanel({
  notes,
  claims,
}: {
  notes: ClaimNoteDTO[];
  claims: ClaimOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newClaimNote({
        ...form,
        category: form.category as ClaimNoteDTO["category"],
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
          {notes.length} diary entr{notes.length === 1 ? "y" : "ies"}
        </p>
        {!showForm && claims.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Add note
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Claim
              <select
                value={form.claimId}
                onChange={(e) => set("claimId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a claim…</option>
                {claims.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Category
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputClass}
              >
                <option value="diary">Diary</option>
                <option value="contact">Contact</option>
                <option value="coverage">Coverage</option>
                <option value="investigation">Investigation</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className={labelClass}>
              Note date
              <input
                type="date"
                value={form.noteDate}
                onChange={(e) => set("noteDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Author
              <input
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Note
              <textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.claimId || !form.body.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save note"}
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
        {notes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {claims.length === 0
              ? "File a claim first, then keep its diary."
              : "No diary entries yet."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notes.map((n) => (
              <li key={n.id} className="px-5 py-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {n.claimNumber}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold">
                    {CATEGORY_LABEL[n.category]}
                  </span>
                  <span>{n.noteDate ?? "—"}</span>
                  {n.author ? <span>· {n.author}</span> : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
