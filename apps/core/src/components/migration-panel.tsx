"use client";

import { useState, useTransition } from "react";
import {
  newMigrationJob,
  editMigrationJob,
  updateMigrationJobStatus,
  removeMigrationJob,
} from "@/app/(shell)/m/migration/actions";

export interface MigrationJobDTO {
  id: string;
  name: string;
  sourceSystem: string;
  entityType: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  recordsExpected: number;
  recordsImported: number;
  recordsFailed: number;
  notes: string;
}

const STATUSES = ["pending", "in_progress", "completed", "failed"] as const;

const STATUS_COLOR: Record<MigrationJobDTO["status"], string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
};

const EMPTY = {
  name: "",
  sourceSystem: "",
  entityType: "",
  recordsExpected: "",
  recordsImported: "",
  recordsFailed: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

function pct(imported: number, expected: number): number {
  if (expected <= 0) return 0;
  return Math.min(100, Math.round((imported / expected) * 100));
}

export function MigrationPanel({ jobs }: { jobs: MigrationJobDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(j: MigrationJobDTO): void {
    setEditId(j.id);
    setForm({
      name: j.name,
      sourceSystem: j.sourceSystem,
      entityType: j.entityType,
      recordsExpected: String(j.recordsExpected),
      recordsImported: String(j.recordsImported),
      recordsFailed: String(j.recordsFailed),
      notes: j.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editMigrationJob({ id: editId, ...form });
      else await newMigrationJob(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: MigrationJobDTO["status"]): void {
    startTransition(async () => {
      await updateMigrationJobStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this migration job?")) return;
    startTransition(async () => {
      await removeMigrationJob(id);
    });
  }

  const totalExpected = jobs.reduce((s, j) => s + j.recordsExpected, 0);
  const totalImported = jobs.reduce((s, j) => s + j.recordsImported, 0);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {jobs.length} job{jobs.length === 1 ? "" : "s"} ·{" "}
          {totalImported.toLocaleString()} / {totalExpected.toLocaleString()}{" "}
          records imported
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New migration job
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Job name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. AMS360 client import"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Source system
              <input
                value={form.sourceSystem}
                onChange={(e) => set("sourceSystem", e.target.value)}
                placeholder="e.g. AMS360, Applied Epic, EZLynx"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Entity type
              <input
                value={form.entityType}
                onChange={(e) => set("entityType", e.target.value)}
                placeholder="e.g. Clients, Policies, Claims"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Records expected
              <input
                type="number"
                value={form.recordsExpected}
                onChange={(e) => set("recordsExpected", e.target.value)}
                className={inputClass}
              />
            </label>
            {editId ? (
              <>
                <label className={labelClass}>
                  Records imported
                  <input
                    type="number"
                    value={form.recordsImported}
                    onChange={(e) => set("recordsImported", e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Records failed
                  <input
                    type="number"
                    value={form.recordsFailed}
                    onChange={(e) => set("recordsFailed", e.target.value)}
                    className={inputClass}
                  />
                </label>
              </>
            ) : null}
            <label className={`${labelClass} sm:col-span-2`}>
              Notes
              <input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
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
              {pending ? "Saving…" : editId ? "Save changes" : "Save job"}
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

      <div className="mt-5 space-y-3">
        {jobs.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No migration jobs yet — add one for each entity type you&rsquo;re
            importing from a legacy system.
          </p>
        ) : (
          jobs.map((j) => {
            const progress = pct(j.recordsImported, j.recordsExpected);
            return (
              <div
                key={j.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{j.name}</p>
                    <p className="text-xs text-gray-500">
                      {[j.sourceSystem, j.entityType]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <select
                    value={j.status}
                    disabled={pending}
                    onChange={(e) =>
                      changeStatus(
                        j.id,
                        e.target.value as MigrationJobDTO["status"],
                      )
                    }
                    className={`shrink-0 rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[j.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {j.recordsImported.toLocaleString()} /{" "}
                    {j.recordsExpected.toLocaleString()} imported · {progress}%
                    {j.recordsFailed > 0 ? (
                      <span className="text-rose-600">
                        {" "}
                        · {j.recordsFailed.toLocaleString()} failed
                      </span>
                    ) : null}
                  </p>
                </div>

                {j.notes ? (
                  <p className="mt-2 text-sm text-gray-500">{j.notes}</p>
                ) : null}

                <div className="mt-3 flex gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => openEdit(j)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(j.id)}
                    disabled={pending}
                    className="text-rose-600 hover:text-rose-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
