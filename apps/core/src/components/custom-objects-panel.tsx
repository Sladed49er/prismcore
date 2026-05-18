"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { CustomObjectField } from "@prismcore/db";
import {
  addDefinition,
  saveDefinition,
  removeDefinition,
} from "@/app/(shell)/settings/customize/objects/actions";

export interface DefinitionDTO {
  id: string;
  slug: string;
  label: string;
  pluralLabel: string;
  icon: string;
  fields: CustomObjectField[];
  titleFieldKey: string;
  recordCount: number;
}

const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "email",
  "phone",
  "url",
];

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

interface Draft {
  label: string;
  pluralLabel: string;
  icon: string;
  fields: CustomObjectField[];
  titleFieldKey: string;
}

export function CustomObjectsPanel({
  definitions,
}: {
  definitions: DefinitionDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  function create(): void {
    if (!newName.trim()) return;
    startTransition(async () => {
      await addDefinition(newName);
      setNewName("");
    });
  }

  function startEdit(d: DefinitionDTO): void {
    setEditId(d.id);
    setDraft({
      label: d.label,
      pluralLabel: d.pluralLabel,
      icon: d.icon,
      fields: d.fields.map((f) => ({ ...f })),
      titleFieldKey: d.titleFieldKey,
    });
  }

  function save(id: string): void {
    if (!draft) return;
    startTransition(async () => {
      await saveDefinition({ id, ...draft });
      setEditId(null);
      setDraft(null);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this object and all its records?")) return;
    startTransition(async () => {
      await removeDefinition(id);
    });
  }

  function setField(i: number, patch: Partial<CustomObjectField>): void {
    if (!draft) return;
    setDraft({
      ...draft,
      fields: draft.fields.map((f, idx) =>
        idx === i ? { ...f, ...patch } : f,
      ),
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {definitions.length} custom object
          {definitions.length === 1 ? "" : "s"}
        </p>
        <span className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New object name"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={create}
            disabled={pending || !newName.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            Create
          </button>
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {definitions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No custom objects yet — create one to model a record type the
            built-in modules don&rsquo;t cover.
          </p>
        ) : (
          definitions.map((d) => {
            const isEdit = editId === d.id && draft;
            return (
              <div
                key={d.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                {isEdit && draft ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className={labelClass}>
                        Label
                        <input
                          value={draft.label}
                          onChange={(e) =>
                            setDraft({ ...draft, label: e.target.value })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className={labelClass}>
                        Plural label
                        <input
                          value={draft.pluralLabel}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              pluralLabel: e.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className={labelClass}>
                        Icon (lucide name)
                        <input
                          value={draft.icon}
                          onChange={(e) =>
                            setDraft({ ...draft, icon: e.target.value })
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <div className="space-y-2">
                      {draft.fields.map((field, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5"
                        >
                          <input
                            value={field.label}
                            onChange={(e) =>
                              setField(i, {
                                label: e.target.value,
                                key:
                                  field.key ||
                                  e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, "_"),
                              })
                            }
                            placeholder="Field label"
                            className="rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500"
                          />
                          <select
                            value={field.type}
                            onChange={(e) =>
                              setField(i, { type: e.target.value })
                            }
                            className="rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                setField(i, { required: e.target.checked })
                              }
                            />
                            required
                          </label>
                          {field.type === "select" ? (
                            <input
                              value={field.options.join(", ")}
                              onChange={(e) =>
                                setField(i, {
                                  options: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="option, option"
                              className="rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500"
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                fields: draft.fields.filter(
                                  (_, idx) => idx !== i,
                                ),
                              })
                            }
                            className="text-xs text-gray-400 hover:text-rose-600"
                          >
                            remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            fields: [
                              ...draft.fields,
                              {
                                key: "",
                                label: "",
                                type: "text",
                                required: false,
                                options: [],
                              },
                            ],
                          })
                        }
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        + Add field
                      </button>
                    </div>
                    <label className={labelClass}>
                      Title field
                      <select
                        value={draft.titleFieldKey}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            titleFieldKey: e.target.value,
                          })
                        }
                        className={inputClass}
                      >
                        {draft.fields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label || f.key}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => save(d.id)}
                        disabled={pending}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
                      >
                        Save object
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null);
                          setDraft(null);
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>
                      <span className="font-medium">{d.label}</span>
                      <span className="ml-2 text-sm text-gray-400">
                        {d.fields.length} field
                        {d.fields.length === 1 ? "" : "s"} ·{" "}
                        {d.recordCount} record
                        {d.recordCount === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="flex gap-3">
                      <Link
                        href={`/settings/customize/objects/${d.slug}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Manage records →
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEdit(d)}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(d.id)}
                        disabled={pending}
                        className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
