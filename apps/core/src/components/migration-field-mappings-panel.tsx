"use client";

import { useState, useTransition } from "react";
import {
  newMapping,
  updateMappingStatus,
  removeMapping,
  type FieldMappingForm,
} from "@/app/(shell)/m/migration/actions";

export interface FieldMappingDTO {
  id: string;
  jobName: string;
  sourceField: string;
  targetField: string;
  transform: string;
  status: "mapped" | "needs_review" | "skipped";
}

export interface JobOption {
  id: string;
  name: string;
}

const STATUSES = ["mapped", "needs_review", "skipped"] as const;

const STATUS_COLOR: Record<FieldMappingDTO["status"], string> = {
  mapped: "bg-emerald-50 text-emerald-700",
  needs_review: "bg-amber-50 text-amber-700",
  skipped: "bg-gray-100 text-gray-500",
};

const EMPTY: FieldMappingForm = {
  jobId: "",
  sourceField: "",
  targetField: "",
  transform: "",
  status: "mapped",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function MigrationFieldMappingsPanel({
  mappings,
  jobs,
}: {
  mappings: FieldMappingDTO[];
  jobs: JobOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FieldMappingForm>({ ...EMPTY });

  function set<K extends keyof FieldMappingForm>(
    key: K,
    value: FieldMappingForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newMapping(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: FieldMappingDTO["status"]): void {
    startTransition(async () => {
      await updateMappingStatus({ id, status });
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeMapping(id);
    });
  }

  const review = mappings.filter((m) => m.status === "needs_review").length;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {mappings.length} field mapping{mappings.length === 1 ? "" : "s"}
          {review > 0 ? (
            <span className="text-amber-700"> · {review} need review</span>
          ) : null}
        </p>
        {!showForm && jobs.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + New mapping
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Migration job
              <select
                value={form.jobId}
                onChange={(e) => set("jobId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a job…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
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
            <label className={labelClass}>
              Source field
              <input
                value={form.sourceField}
                onChange={(e) => set("sourceField", e.target.value)}
                placeholder="e.g. CL_NAME"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Target field
              <input
                value={form.targetField}
                onChange={(e) => set("targetField", e.target.value)}
                placeholder="e.g. clients.businessName"
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Transform notes
              <input
                value={form.transform}
                onChange={(e) => set("transform", e.target.value)}
                placeholder="Any conversion applied between source and target"
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.jobId || !form.sourceField.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save mapping"}
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
        {mappings.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {jobs.length === 0
              ? "Add a migration job first, then map its fields."
              : "No field mappings yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Source → Target</th>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mappings.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">
                      {m.sourceField}
                      <span className="text-gray-400"> → </span>
                      {m.targetField || "(unset)"}
                    </span>
                    {m.transform ? (
                      <span className="block text-xs text-gray-400">
                        {m.transform}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.jobName}</td>
                  <td className="px-4 py-3">
                    <select
                      value={m.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          m.id,
                          e.target.value as FieldMappingDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[m.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      disabled={pending}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Delete
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
