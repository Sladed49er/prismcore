"use client";

import { useState, useTransition } from "react";
import {
  newRequest,
  editRequest,
  updateRequestStatus,
  removeRequest,
  type WebsiteRequestForm,
} from "@/app/(shell)/m/website/actions";

export interface WebsiteRequestDTO {
  id: string;
  title: string;
  description: string;
  type: "content_update" | "new_page" | "design" | "bug" | "seo" | "other";
  priority: "low" | "normal" | "high" | "urgent";
  status: "submitted" | "in_progress" | "in_review" | "completed" | "declined";
  requestorName: string;
  pageRef: string;
  resolution: string;
}

const TYPES = [
  "content_update",
  "new_page",
  "design",
  "bug",
  "seo",
  "other",
] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const STATUSES = [
  "submitted",
  "in_progress",
  "in_review",
  "completed",
  "declined",
] as const;

const TYPE_LABEL: Record<WebsiteRequestDTO["type"], string> = {
  content_update: "Content update",
  new_page: "New page",
  design: "Design",
  bug: "Bug",
  seo: "SEO",
  other: "Other",
};

const STATUS_COLOR: Record<WebsiteRequestDTO["status"], string> = {
  submitted: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-50 text-blue-700",
  in_review: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  declined: "bg-rose-50 text-rose-700",
};

const PRIORITY_COLOR: Record<WebsiteRequestDTO["priority"], string> = {
  low: "text-gray-400",
  normal: "text-gray-500",
  high: "text-amber-600",
  urgent: "text-rose-600",
};

const EMPTY: WebsiteRequestForm = {
  title: "",
  description: "",
  type: "content_update",
  priority: "normal",
  status: "submitted",
  requestorName: "",
  pageRef: "",
  resolution: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function WebsiteRequestsPanel({
  requests,
}: {
  requests: WebsiteRequestDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<WebsiteRequestForm>({ ...EMPTY });

  function set<K extends keyof WebsiteRequestForm>(
    key: K,
    value: WebsiteRequestForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(r: WebsiteRequestDTO): void {
    setEditId(r.id);
    setForm({
      title: r.title,
      description: r.description,
      type: r.type,
      priority: r.priority,
      status: r.status,
      requestorName: r.requestorName,
      pageRef: r.pageRef,
      resolution: r.resolution,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editRequest({ id: editId, ...form });
      else await newRequest(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: WebsiteRequestDTO["status"]): void {
    startTransition(async () => {
      await updateRequestStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this request?")) return;
    startTransition(async () => {
      await removeRequest(id);
    });
  }

  const open = requests.filter(
    (r) => r.status !== "completed" && r.status !== "declined",
  ).length;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {requests.length} request{requests.length === 1 ? "" : "s"} · {open}{" "}
          open
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New request
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Update the team page photos"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Page / area
              <input
                value={form.pageRef}
                onChange={(e) => set("pageRef", e.target.value)}
                placeholder="e.g. /about"
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
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Priority
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className={inputClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Requested by
              <input
                value={form.requestorName}
                onChange={(e) => set("requestorName", e.target.value)}
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
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
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
              Resolution notes
              <input
                value={form.resolution}
                onChange={(e) => set("resolution", e.target.value)}
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
              {pending ? "Saving…" : editId ? "Save changes" : "Save request"}
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
        {requests.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No website requests yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.title}</span>
                    {r.description ? (
                      <span className="block text-xs text-gray-500">
                        {r.description}
                      </span>
                    ) : null}
                    <span className="block text-xs text-gray-400">
                      {[
                        r.pageRef,
                        r.requestorName && `by ${r.requestorName}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[r.type]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold ${PRIORITY_COLOR[r.priority]}`}
                    >
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          r.id,
                          e.target.value as WebsiteRequestDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
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
