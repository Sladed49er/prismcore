"use client";

import { useState, useTransition } from "react";
import {
  newClientActivity,
  editClientActivity,
  removeClientActivity,
} from "@/app/(shell)/m/clients/activities/actions";

export interface ClientOption {
  id: string;
  label: string;
}

export interface ClientActivityDTO {
  id: string;
  clientId: string;
  clientName: string;
  activityType: "call" | "email" | "meeting" | "note" | "task";
  subject: string;
  detail: string;
  activityDate: string | null;
  author: string;
}

const TYPE_LABEL: Record<ClientActivityDTO["activityType"], string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  task: "Task",
};

const EMPTY = {
  clientId: "",
  activityType: "note",
  subject: "",
  detail: "",
  activityDate: "",
  author: "",
};

export function ClientActivitiesPanel({
  activities,
  clients,
}: {
  activities: ClientActivityDTO[];
  clients: ClientOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [query, setQuery] = useState("");

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startCreate(): void {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(a: ClientActivityDTO): void {
    setForm({
      clientId: a.clientId,
      activityType: a.activityType,
      subject: a.subject,
      detail: a.detail,
      activityDate: a.activityDate ?? "",
      author: a.author,
    });
    setEditingId(a.id);
    setShowForm(true);
  }

  function close(): void {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY });
  }

  function submit(): void {
    startTransition(async () => {
      if (editingId) {
        await editClientActivity({
          id: editingId,
          ...form,
          activityType:
            form.activityType as ClientActivityDTO["activityType"],
        });
      } else {
        await newClientActivity({
          ...form,
          activityType:
            form.activityType as ClientActivityDTO["activityType"],
        });
      }
      close();
    });
  }

  function remove(a: ClientActivityDTO): void {
    if (!confirm(`Delete activity "${a.subject}"?`)) return;
    startTransition(async () => {
      await removeClientActivity(a.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? activities.filter((a) =>
        [a.subject, a.clientName, a.detail, a.author]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : activities;

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search activity…"
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Log activity
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700">
            {editingId ? "Edit activity" : "Log activity"}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Client
              <select
                value={form.clientId}
                onChange={(e) => set("clientId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Activity type
              <select
                value={form.activityType}
                onChange={(e) => set("activityType", e.target.value)}
                className={inputClass}
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Note</option>
                <option value="task">Task</option>
              </select>
            </label>
            <label className={labelClass}>
              Date
              <input
                type="date"
                value={form.activityDate}
                onChange={(e) => set("activityDate", e.target.value)}
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
              Subject
              <input
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Detail
              <textarea
                value={form.detail}
                onChange={(e) => set("detail", e.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.clientId || !form.subject.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update activity"
                  : "Save activity"}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {clients.length === 0
              ? "Add a client first, then log its interactions."
              : activities.length === 0
                ? "No activity logged yet."
                : "No activity matches your search."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((a) => (
              <li key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">
                      {a.clientName}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold">
                      {TYPE_LABEL[a.activityType]}
                    </span>
                    <span>{a.activityDate ?? "—"}</span>
                    {a.author ? <span>· {a.author}</span> : null}
                  </div>
                  <div className="shrink-0 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(a)}
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(a)}
                      className="ml-3 text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {a.subject}
                </p>
                {a.detail ? (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-600">
                    {a.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
