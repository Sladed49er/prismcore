"use client";

import { useState, useTransition } from "react";
import type { CustomObjectField } from "@prismcore/db";
import {
  addRecord,
  saveRecord,
  removeRecord,
} from "@/app/(shell)/settings/customize/objects/actions";

export interface RecordDTO {
  id: string;
  title: string;
  values: Record<string, string>;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomObjectField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={inputClass}
      />
    );
  }
  if (field.type === "select") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">Select…</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={
        field.type === "number"
          ? "number"
          : field.type === "date"
            ? "date"
            : field.type === "email"
              ? "email"
              : field.type === "url"
                ? "url"
                : field.type === "phone"
                  ? "tel"
                  : "text"
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

export function CustomObjectRecordsPanel({
  slug,
  definitionId,
  fields,
  records,
}: {
  slug: string;
  definitionId: string;
  fields: CustomObjectField[];
  records: RecordDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  function startNew(): void {
    setEditId(null);
    setShowNew(true);
    setValues({});
  }
  function startEdit(r: RecordDTO): void {
    setShowNew(false);
    setEditId(r.id);
    setValues({ ...r.values });
  }
  function reset(): void {
    setEditId(null);
    setShowNew(false);
    setValues({});
  }

  function save(): void {
    startTransition(async () => {
      if (editId) await saveRecord(slug, editId, values);
      else await addRecord(slug, definitionId, values);
      reset();
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this record?")) return;
    startTransition(async () => {
      await removeRecord(slug, id);
    });
  }

  const editing = showNew || editId !== null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {records.length} record{records.length === 1 ? "" : "s"}
        </p>
        {!editing && fields.length > 0 ? (
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New record
          </button>
        ) : null}
      </div>

      {fields.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
          This object has no fields yet — add fields on the Custom Objects
          page first.
        </p>
      ) : null}

      {editing ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <label key={f.key} className={labelClass}>
                {f.label}
                {f.required ? " *" : ""}
                <FieldInput
                  field={f}
                  value={values[f.key] ?? ""}
                  onChange={(v) => setValues({ ...values, [f.key]: v })}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save record"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {records.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No records yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {fields.slice(0, 4).map((f) => (
                  <th key={f.key} className="px-4 py-2.5 font-semibold">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id}>
                  {fields.slice(0, 4).map((f, i) => (
                    <td
                      key={f.key}
                      className={`px-4 py-2.5 ${i === 0 ? "font-medium" : "text-gray-600"}`}
                    >
                      {r.values[f.key] || "—"}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right">
                    <span className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        disabled={pending}
                        className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </span>
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
