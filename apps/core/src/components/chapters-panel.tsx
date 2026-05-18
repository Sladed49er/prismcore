"use client";

import { useState, useTransition } from "react";
import {
  newChapter,
  editChapter,
  updateChapterStatus,
  removeChapter,
  type ChapterForm,
} from "@/app/(shell)/m/chapters/actions";

export interface ChapterDTO {
  id: string;
  name: string;
  type: "geographic" | "functional" | "student";
  region: string;
  leaderName: string;
  memberCount: number;
  status: "active" | "forming" | "inactive";
  notes: string;
}

const TYPES = ["geographic", "functional", "student"] as const;
const STATUSES = ["active", "forming", "inactive"] as const;

const STATUS_COLOR: Record<ChapterDTO["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  forming: "bg-amber-50 text-amber-700",
  inactive: "bg-gray-100 text-gray-500",
};

const EMPTY: ChapterForm = {
  name: "",
  type: "geographic",
  region: "",
  leaderName: "",
  memberCount: "",
  status: "active",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function ChaptersPanel({ chapters }: { chapters: ChapterDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ChapterForm>({ ...EMPTY });

  function set<K extends keyof ChapterForm>(
    key: K,
    value: ChapterForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(c: ChapterDTO): void {
    setEditId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      region: c.region,
      leaderName: c.leaderName,
      memberCount: c.memberCount ? String(c.memberCount) : "",
      status: c.status,
      notes: c.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editChapter({ id: editId, ...form });
      else await newChapter(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: ChapterDTO["status"]): void {
    startTransition(async () => {
      await updateChapterStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this chapter?")) return;
    startTransition(async () => {
      await removeChapter(id);
    });
  }

  const totalMembers = chapters.reduce((s, c) => s + c.memberCount, 0);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {chapters.length} chapter{chapters.length === 1 ? "" : "s"} ·{" "}
          {totalMembers.toLocaleString()} members
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New chapter
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Chapter name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Type
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Region
              <input
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                placeholder="e.g. Pacific Northwest"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Chapter leader
              <input
                value={form.leaderName}
                onChange={(e) => set("leaderName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Member count
              <input
                type="number"
                value={form.memberCount}
                onChange={(e) => set("memberCount", e.target.value)}
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
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save chapter"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {chapters.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No chapters yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Chapter</th>
                <th className="px-4 py-3 font-semibold">Leader</th>
                <th className="px-4 py-3 font-semibold">Members</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {chapters.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{c.name}</span>
                    <span className="block text-xs text-gray-500">
                      {[c.type, c.region].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.leaderName || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {c.memberCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          c.id,
                          e.target.value as ChapterDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[c.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        disabled={pending}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        Delete
                      </button>
                    </div>
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
