"use client";

import { useState, useTransition } from "react";
import { addTask, advanceTask } from "@/app/(shell)/m/tasks/list/actions";

export interface TaskDTO {
  id: string;
  title: string;
  assignee: string;
  priority: string;
  dueDate: string | null;
  status: string;
}

export interface CustomFieldDTO {
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
}

const STATUSES = ["open", "in_progress", "done"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  done: "bg-green-50 text-green-700",
};
const PRIORITY_STYLE: Record<string, string> = {
  low: "text-gray-400",
  normal: "text-gray-600",
  high: "text-red-600 font-semibold",
};

function statusLabel(s: string): string {
  return s.replace("_", " ");
}

const EMPTY = {
  title: "",
  description: "",
  status: "open",
  priority: "normal",
  dueDate: "",
  assignee: "",
};

export function TasksPanel({
  tasks,
  customFields,
}: {
  tasks: TaskDTO[];
  customFields: CustomFieldDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [custom, setCustom] = useState<Record<string, string>>({});

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addTask({
        title: form.title,
        description: form.description,
        status: form.status as Status,
        priority: form.priority as "low" | "normal" | "high",
        dueDate: form.dueDate,
        assignee: form.assignee,
        customValues: custom,
      });
      setForm({ ...EMPTY });
      setCustom({});
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: Status): void {
    startTransition(async () => {
      await advanceTask(id, status);
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
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New task
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
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
                    {statusLabel(s)}
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
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
              </select>
            </label>
            <label className={labelClass}>
              Due date
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Assignee
              <input
                value={form.assignee}
                onChange={(e) => set("assignee", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                className={inputClass}
              />
            </label>
          </div>
          {customFields.length > 0 ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Your custom fields
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {customFields.map((f) => (
                  <label key={f.fieldKey} className={labelClass}>
                    {f.label}
                    {f.required ? " *" : ""}
                    <input
                      type={
                        f.fieldType === "number"
                          ? "number"
                          : f.fieldType === "date"
                            ? "date"
                            : "text"
                      }
                      value={custom[f.fieldKey] ?? ""}
                      onChange={(e) =>
                        setCustom((c) => ({
                          ...c,
                          [f.fieldKey]: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.title.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save task"}
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
        {tasks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No tasks yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Task</th>
                <th className="px-4 py-3 font-semibold">Assignee</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.assignee || "—"}
                  </td>
                  <td
                    className={`px-4 py-3 ${PRIORITY_STYLE[t.priority] ?? "text-gray-600"}`}
                  >
                    {t.priority}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      onChange={(e) =>
                        changeStatus(t.id, e.target.value as Status)
                      }
                      disabled={pending}
                      aria-label="Task status"
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STATUS_STYLE[t.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
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
