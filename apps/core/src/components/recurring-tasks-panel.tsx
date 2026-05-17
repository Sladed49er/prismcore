"use client";

import { useState, useTransition } from "react";
import {
  newRecurringTask,
  updateRecurringTaskStatus,
} from "@/app/(shell)/m/tasks/recurring/actions";

export interface RecurringTaskDTO {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: "low" | "normal" | "high";
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
  nextDueDate: string | null;
  status: "active" | "paused";
}

const FREQ_LABEL: Record<RecurringTaskDTO["frequency"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

const PRIORITY_COLOR: Record<RecurringTaskDTO["priority"], string> = {
  low: "text-gray-500",
  normal: "text-blue-600",
  high: "text-rose-600",
};

const EMPTY = {
  title: "",
  description: "",
  assignee: "",
  priority: "normal",
  frequency: "monthly",
  nextDueDate: "",
};

export function RecurringTasksPanel({
  tasks,
}: {
  tasks: RecurringTaskDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newRecurringTask({
        ...form,
        priority: form.priority as RecurringTaskDTO["priority"],
        frequency: form.frequency as RecurringTaskDTO["frequency"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function toggle(id: string, status: RecurringTaskDTO["status"]): void {
    startTransition(async () => {
      await updateRecurringTaskStatus({
        id,
        status: status === "active" ? "paused" : "active",
      });
    });
  }

  const active = tasks.filter((t) => t.status === "active").length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {tasks.length} recurring task{tasks.length === 1 ? "" : "s"} ·{" "}
          {active} active
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New recurring task
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
            <label className={labelClass}>
              Priority
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className={inputClass}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className={labelClass}>
              Frequency
              <select
                value={form.frequency}
                onChange={(e) => set("frequency", e.target.value)}
                className={inputClass}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </label>
            <label className={labelClass}>
              Next due date
              <input
                type="date"
                value={form.nextDueDate}
                onChange={(e) => set("nextDueDate", e.target.value)}
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
              disabled={pending || !form.title.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save recurring task"}
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
            No recurring tasks yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Task</th>
                <th className="px-4 py-3 font-semibold">Assignee</th>
                <th className="px-4 py-3 font-semibold">Frequency</th>
                <th className="px-4 py-3 font-semibold">Next due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{t.title}</span>
                    <span
                      className={`ml-2 text-xs font-semibold ${PRIORITY_COLOR[t.priority]}`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.assignee || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {FREQ_LABEL[t.frequency]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.nextDueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        t.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(t.id, t.status)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      {t.status === "active" ? "Pause" : "Resume"}
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
