"use client";

import { useState, useTransition } from "react";
import {
  newAnnouncement,
  changeAnnouncementStatus,
} from "@/app/admin/announcements/actions";

export interface AnnouncementDTO {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  status: "draft" | "published";
  publishedAt: string | null;
}

const SEVERITY_COLOR: Record<AnnouncementDTO["severity"], string> = {
  info: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-700",
  critical: "bg-rose-50 text-rose-700",
};

const EMPTY = { title: "", body: "", severity: "info" };

export function AdminAnnouncementsPanel({
  announcements,
}: {
  announcements: AnnouncementDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newAnnouncement({
        ...form,
        severity: form.severity as AnnouncementDTO["severity"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: AnnouncementDTO["status"],
  ): void {
    startTransition(async () => {
      await changeAnnouncementStatus({ id, status });
    });
  }

  const published = announcements.filter(
    (a) => a.status === "published",
  ).length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {announcements.length} announcement
          {announcements.length === 1 ? "" : "s"} · {published} published
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New announcement
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3">
            <label className={labelClass}>
              Title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Severity
              <select
                value={form.severity}
                onChange={(e) => set("severity", e.target.value)}
                className={inputClass}
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className={labelClass}>
              Body
              <textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={4}
                placeholder="Maintenance window, security advisory, release note…"
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
              {pending ? "Saving…" : "Save as draft"}
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

      <div className="mt-5 space-y-3">
        {announcements.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No announcements yet.
          </p>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLOR[a.severity]}`}
                    >
                      {a.severity}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        a.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-semibold">{a.title}</h3>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    changeStatus(
                      a.id,
                      a.status === "published" ? "draft" : "published",
                    )
                  }
                  className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                    a.status === "published"
                      ? "border border-gray-300 text-gray-600 hover:bg-gray-50"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {a.status === "published" ? "Unpublish" : "Publish"}
                </button>
              </div>
              {a.body ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {a.body}
                </p>
              ) : null}
              {a.publishedAt ? (
                <p className="mt-2 text-xs text-gray-400">
                  Published {a.publishedAt}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
