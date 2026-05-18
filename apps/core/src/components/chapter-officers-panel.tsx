"use client";

import { useState, useTransition } from "react";
import {
  newOfficer,
  removeOfficer,
  type ChapterOfficerForm,
} from "@/app/(shell)/m/chapters/actions";

export interface ChapterOfficerDTO {
  id: string;
  chapterName: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  termEnd: string | null;
}

export interface ChapterOption {
  id: string;
  name: string;
}

const EMPTY: ChapterOfficerForm = {
  chapterId: "",
  name: "",
  role: "",
  email: "",
  phone: "",
  termEnd: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function ChapterOfficersPanel({
  officers,
  chapters,
}: {
  officers: ChapterOfficerDTO[];
  chapters: ChapterOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ChapterOfficerForm>({ ...EMPTY });

  function set<K extends keyof ChapterOfficerForm>(
    key: K,
    value: ChapterOfficerForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newOfficer(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeOfficer(id);
    });
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {officers.length} officer{officers.length === 1 ? "" : "s"}
        </p>
        {!showForm && chapters.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + New officer
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Chapter
              <select
                value={form.chapterId}
                onChange={(e) => set("chapterId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a chapter…</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Role
              <input
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="President, Treasurer, …"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Term ends
              <input
                type="date"
                value={form.termEnd}
                onChange={(e) => set("termEnd", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.chapterId || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save officer"}
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
        {officers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {chapters.length === 0
              ? "Add a chapter first, then its officers."
              : "No officers yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Officer</th>
                <th className="px-4 py-3 font-semibold">Chapter</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Term ends</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {officers.map((o) => (
                <tr key={o.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{o.name}</span>
                    {o.email || o.phone ? (
                      <span className="block text-xs text-gray-400">
                        {[o.email, o.phone].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {o.chapterName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {o.role || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {o.termEnd ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(o.id)}
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
