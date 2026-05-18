"use client";

import { useState, useTransition } from "react";
import {
  newComment,
  removeComment,
  type RequestCommentForm,
} from "@/app/(shell)/m/website/actions";

export interface RequestCommentDTO {
  id: string;
  requestTitle: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface RequestOption {
  id: string;
  title: string;
}

const EMPTY: RequestCommentForm = {
  requestId: "",
  authorName: "",
  body: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function WebsiteRequestCommentsPanel({
  comments,
  requests,
}: {
  comments: RequestCommentDTO[];
  requests: RequestOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RequestCommentForm>({ ...EMPTY });

  function set<K extends keyof RequestCommentForm>(
    key: K,
    value: RequestCommentForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newComment(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeComment(id);
    });
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </p>
        {!showForm && requests.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + Add a comment
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3">
            <label className={labelClass}>
              Request
              <select
                value={form.requestId}
                onChange={(e) => set("requestId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a request…</option>
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Author
              <input
                value={form.authorName}
                onChange={(e) => set("authorName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Comment
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
              disabled={pending || !form.requestId || !form.body.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Post comment"}
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

      <div className="mt-5 space-y-2">
        {comments.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
            {requests.length === 0
              ? "Add a request first, then track its activity here."
              : "No comments yet."}
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-gray-700">
                  {c.authorName || "Team"}
                  <span className="ml-2 font-normal text-gray-400">
                    on {c.requestTitle}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    disabled={pending}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-700">
                {c.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
