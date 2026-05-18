"use client";

import { useState, useTransition } from "react";
import {
  newPage,
  editPage,
  updatePageStatus,
  removePage,
  type WebsitePageForm,
} from "@/app/(shell)/m/website/actions";

export interface WebsitePageDTO {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  summary: string;
  url: string;
  notes: string;
}

const STATUSES = ["draft", "published", "archived"] as const;

const STATUS_COLOR: Record<WebsitePageDTO["status"], string> = {
  draft: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-gray-100 text-gray-500",
};

const EMPTY: WebsitePageForm = {
  title: "",
  slug: "",
  status: "draft",
  summary: "",
  url: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function WebsitePagesPanel({ pages }: { pages: WebsitePageDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<WebsitePageForm>({ ...EMPTY });

  function set<K extends keyof WebsitePageForm>(
    key: K,
    value: WebsitePageForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(p: WebsitePageDTO): void {
    setEditId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      status: p.status,
      summary: p.summary,
      url: p.url,
      notes: p.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editPage({ id: editId, ...form });
      else await newPage(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: WebsitePageDTO["status"]): void {
    startTransition(async () => {
      await updatePageStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this page entry?")) return;
    startTransition(async () => {
      await removePage(id);
    });
  }

  const published = pages.filter((p) => p.status === "published").length;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {pages.length} page{pages.length === 1 ? "" : "s"} · {published}{" "}
          published
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + New page
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Page title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Path
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="/about"
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
            <label className={labelClass}>
              Live URL
              <input
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Summary
              <input
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
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
              disabled={pending || !form.title.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save page"}
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
        {pages.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No pages tracked yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Page</th>
                <th className="px-4 py-3 font-semibold">Path</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.title}</span>
                    {p.summary ? (
                      <span className="block text-xs text-gray-500">
                        {p.summary}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {p.slug || p.url}
                      </a>
                    ) : (
                      p.slug || "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          p.id,
                          e.target.value as WebsitePageDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[p.status]}`}
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
                        onClick={() => openEdit(p)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
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
