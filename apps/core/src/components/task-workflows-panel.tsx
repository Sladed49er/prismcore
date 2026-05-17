"use client";

import { useState, useTransition } from "react";
import {
  newTaskWorkflow,
  updateWorkflowStatus,
} from "@/app/(shell)/m/tasks/workflows/actions";

export interface TaskWorkflowDTO {
  id: string;
  name: string;
  description: string;
  steps: string;
  status: "draft" | "active" | "archived";
}

const STATUS_COLOR: Record<TaskWorkflowDTO["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-emerald-50 text-emerald-700",
  archived: "bg-amber-50 text-amber-700",
};

const EMPTY = { name: "", description: "", steps: "" };

function stepLines(steps: string): string[] {
  return steps
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TaskWorkflowsPanel({
  workflows,
}: {
  workflows: TaskWorkflowDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newTaskWorkflow(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: TaskWorkflowDTO["status"]): void {
    startTransition(async () => {
      await updateWorkflowStatus({ id, status });
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
          {workflows.length} workflow{workflows.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New workflow
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3">
            <label className={labelClass}>
              Workflow name
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
            <label className={labelClass}>
              Steps — one per line
              <textarea
                value={form.steps}
                onChange={(e) => set("steps", e.target.value)}
                rows={5}
                placeholder={"Gather documents\nReview coverage\nSend to carrier"}
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
              {pending ? "Saving…" : "Save workflow"}
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
        {workflows.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No workflows defined yet.
          </p>
        ) : (
          workflows.map((w) => {
            const steps = stepLines(w.steps);
            return (
              <div
                key={w.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{w.name}</h3>
                    {w.description ? (
                      <p className="mt-0.5 text-sm text-gray-600">
                        {w.description}
                      </p>
                    ) : null}
                  </div>
                  <select
                    value={w.status}
                    disabled={pending}
                    onChange={(e) =>
                      changeStatus(
                        w.id,
                        e.target.value as TaskWorkflowDTO["status"],
                      )
                    }
                    className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[w.status]}`}
                  >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
                {steps.length > 0 ? (
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
                    {steps.map((s, i) => (
                      <li key={`${w.id}-${i}`}>{s}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">No steps.</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
