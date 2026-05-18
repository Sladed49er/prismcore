"use client";

import { useState, useTransition } from "react";
import type { IntakeFormField } from "@prismcore/db";
import {
  addForm,
  saveForm,
  removeForm,
  convertSubmission,
  archiveIntakeSubmission,
} from "@/app/(shell)/m/intake_forms/actions";

export interface FormDTO {
  id: string;
  name: string;
  description: string;
  publicToken: string;
  status: string;
  fields: IntakeFormField[];
}
export interface SubmissionDTO {
  id: string;
  formName: string;
  values: Record<string, string>;
  status: string;
  leadId: string | null;
  createdAt: string;
}

const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "date",
  "select",
];

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function IntakeFormsPanel({
  forms,
  submissions,
  baseUrl,
}: {
  forms: FormDTO[];
  submissions: SubmissionDTO[];
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormDTO | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function create(): void {
    if (!newName.trim()) return;
    startTransition(async () => {
      await addForm(newName);
      setNewName("");
    });
  }

  function startEdit(f: FormDTO): void {
    setEditId(f.id);
    setDraft({ ...f, fields: f.fields.map((x) => ({ ...x })) });
  }

  function save(): void {
    if (!draft) return;
    startTransition(async () => {
      await saveForm({
        id: draft.id,
        name: draft.name,
        description: draft.description,
        status: draft.status,
        fields: draft.fields,
      });
      setEditId(null);
      setDraft(null);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this form and its submissions?")) return;
    startTransition(async () => {
      await removeForm(id);
    });
  }

  function convert(id: string): void {
    setStatus(null);
    startTransition(async () => {
      const r = await convertSubmission(id);
      setStatus(r.message);
    });
  }

  function setField(i: number, patch: Partial<IntakeFormField>): void {
    if (!draft) return;
    const fields = draft.fields.map((f, idx) =>
      idx === i ? { ...f, ...patch } : f,
    );
    setDraft({ ...draft, fields });
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Forms */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Forms
          </h2>
          <span className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New form name"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={create}
              disabled={pending || !newName.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              Add
            </button>
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {forms.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
              No intake forms yet.
            </p>
          ) : (
            forms.map((f) => {
              const isEdit = editId === f.id && draft;
              const url = `${baseUrl}/intake/${f.publicToken}`;
              return (
                <div
                  key={f.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  {isEdit && draft ? (
                    <div className="space-y-3">
                      <input
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      />
                      <textarea
                        value={draft.description}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                        placeholder="Description shown on the public form"
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      />
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDraft({ ...draft, status: e.target.value })
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      >
                        <option value="draft">draft</option>
                        <option value="published">published</option>
                      </select>
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
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={save}
                          disabled={pending}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
                        >
                          Save
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
                    <>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              f.status === "published"
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {f.status}
                          </span>
                          <span className="font-medium">{f.name}</span>
                          <span className="text-sm text-gray-400">
                            {f.fields.length} field
                            {f.fields.length === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(f)}
                            className="text-xs font-semibold text-indigo-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(f.id)}
                            disabled={pending}
                            className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                      {f.status === "published" ? (
                        <p className="mt-2 text-xs text-gray-500">
                          Public link:{" "}
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {url}
                          </a>
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-gray-400">
                          Publish the form to get a shareable public link.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Submissions */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Submissions
        </h2>
        {status ? (
          <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700">
            {status}
          </p>
        ) : null}
        <div className="mt-3 space-y-2">
          {submissions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
              No submissions yet.
            </p>
          ) : (
            submissions.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl border bg-white p-4 ${
                  s.status === "new"
                    ? "border-gray-200"
                    : "border-gray-100 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-gray-400">
                      {s.formName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {fmt(s.createdAt)}
                    </span>
                    {s.status !== "new" ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {s.status}
                      </span>
                    ) : null}
                  </span>
                  {s.status === "new" ? (
                    <span className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => convert(s.id)}
                        disabled={pending}
                        className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50"
                      >
                        Convert to lead
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            await archiveIntakeSubmission(s.id);
                          })
                        }
                        disabled={pending}
                        className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                      >
                        Archive
                      </button>
                    </span>
                  ) : null}
                </div>
                <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {Object.entries(s.values).map(([k, v]) => (
                    <div key={k}>
                      <dt className="inline text-gray-400">{k}: </dt>
                      <dd className="inline text-gray-700">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
