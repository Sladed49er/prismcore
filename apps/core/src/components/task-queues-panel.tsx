"use client";

import { useState, useTransition } from "react";
import { newTaskQueue } from "@/app/(shell)/m/tasks/queues/actions";

export interface TaskQueueDTO {
  id: string;
  name: string;
  description: string;
}

const EMPTY = { name: "", description: "" };

export function TaskQueuesPanel({ queues }: { queues: TaskQueueDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newTaskQueue(form);
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
          {queues.length} queue{queues.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New queue
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Queue name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Description
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
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
              {pending ? "Saving…" : "Save queue"}
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
        {queues.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No work queues defined yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Queue</th>
                <th className="px-4 py-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queues.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3 font-medium">{q.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {q.description || "—"}
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
