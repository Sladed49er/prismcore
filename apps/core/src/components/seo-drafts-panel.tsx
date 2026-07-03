"use client";

import { useState, useTransition } from "react";
import {
  editDraft,
  updateDraftStatus,
  removeDraft,
  publishApprovedDraft,
  type SeoDraftForm,
} from "@/app/(shell)/m/seo_engine/actions";

export interface SeoDraftDTO {
  id: string;
  title: string;
  slug: string;
  metaDescription: string;
  body: string;
  status: "draft" | "in_review" | "approved" | "published" | "discarded";
  publishedUrl: string;
}

const STATUS_COLOR: Record<SeoDraftDTO["status"], string> = {
  draft: "bg-amber-50 text-amber-700",
  in_review: "bg-blue-50 text-blue-700",
  approved: "bg-emerald-50 text-emerald-700",
  published: "bg-indigo-50 text-indigo-700",
  discarded: "bg-gray-100 text-gray-500",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function SeoDraftsPanel({ drafts }: { drafts: SeoDraftDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<SeoDraftForm>({
    title: "",
    slug: "",
    metaDescription: "",
    body: "",
  });
  const [notice, setNotice] = useState<string | null>(null);

  function set<K extends keyof SeoDraftForm>(
    key: K,
    value: SeoDraftForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openEdit(d: SeoDraftDTO): void {
    setEditId(d.id);
    setForm({
      title: d.title,
      slug: d.slug,
      metaDescription: d.metaDescription,
      body: d.body,
    });
  }

  function submitEdit(): void {
    if (!editId) return;
    startTransition(async () => {
      await editDraft({ id: editId, ...form });
      setEditId(null);
    });
  }

  function transition(id: string, status: SeoDraftDTO["status"]): void {
    startTransition(() => updateDraftStatus({ id, status }));
  }

  function publish(id: string): void {
    setNotice("Publishing…");
    startTransition(async () => {
      const result = await publishApprovedDraft(id);
      setNotice(result.message);
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Content drafts
        </h2>
        <p className="text-sm text-gray-500">
          AI-drafted articles. Review, approve, then publish to the site.
        </p>
      </div>

      {notice && (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          {notice}
        </p>
      )}

      <ul className="mt-4 divide-y divide-gray-100">
        {drafts.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-400">
            No drafts yet — generate one from a keyword below.
          </li>
        )}
        {drafts.map((d) => (
          <li key={d.id} className="py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {d.title}
                </p>
                <p className="truncate text-xs text-gray-500">
                  /{d.slug}
                  {d.publishedUrl && (
                    <>
                      {" · "}
                      <a
                        href={d.publishedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        view live
                      </a>
                    </>
                  )}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[d.status]}`}
              >
                {d.status.replace("_", " ")}
              </span>
              <button
                onClick={() => setOpenId(openId === d.id ? null : d.id)}
                className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
              >
                {openId === d.id ? "Hide" : "Read"}
              </button>
              {(d.status === "draft" || d.status === "in_review") && (
                <>
                  <button
                    onClick={() => openEdit(d)}
                    className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => transition(d.id, "approved")}
                    disabled={pending}
                    className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => transition(d.id, "discarded")}
                    disabled={pending}
                    className="rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
                  >
                    Discard
                  </button>
                </>
              )}
              {d.status === "approved" && (
                <button
                  onClick={() => publish(d.id)}
                  disabled={pending}
                  className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Publish
                </button>
              )}
              {(d.status === "discarded" || d.status === "published") && (
                <button
                  onClick={() => startTransition(() => removeDraft(d.id))}
                  className="rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>

            {openId === d.id && editId !== d.id && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">{d.metaDescription}</p>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-sm text-gray-800">
                  {d.body}
                </pre>
              </div>
            )}

            {editId === d.id && (
              <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <label className="block">
                  <span className={labelClass}>Title</span>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Slug</span>
                    <input
                      className={inputClass}
                      value={form.slug}
                      onChange={(e) => set("slug", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Meta description</span>
                    <input
                      className={inputClass}
                      value={form.metaDescription}
                      onChange={(e) => set("metaDescription", e.target.value)}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={labelClass}>Body (Markdown)</span>
                  <textarea
                    className={`${inputClass} font-mono`}
                    rows={14}
                    value={form.body}
                    onChange={(e) => set("body", e.target.value)}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={submitEdit}
                    disabled={pending}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
