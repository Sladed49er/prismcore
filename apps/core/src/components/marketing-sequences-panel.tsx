"use client";

import { useState, useTransition } from "react";
import type { SequenceStep } from "@prismcore/db";
import {
  addSequence,
  saveSequence,
  removeSequence,
  enroll,
  cancelEnroll,
} from "@/app/(shell)/m/marketing/sequences/actions";

export interface SequenceDTO {
  id: string;
  name: string;
  status: string;
  steps: SequenceStep[];
}
export interface TemplateOption {
  id: string;
  name: string;
}
export interface ClientOption {
  id: string;
  name: string;
}
export interface EnrollmentDTO {
  id: string;
  sequenceName: string;
  clientName: string;
  status: string;
  currentStep: number;
  nextSendAt: string | null;
}
export interface SendDTO {
  id: string;
  toEmail: string;
  subject: string;
  source: string;
  status: string;
  sentAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-50 text-green-700",
  archived: "bg-gray-100 text-gray-400",
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function MarketingSequencesPanel({
  sequences,
  templates,
  clients,
  enrollments,
  sends,
}: {
  sequences: SequenceDTO[];
  templates: TemplateOption[];
  clients: ClientOption[];
  enrollments: EnrollmentDTO[];
  sends: SendDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SequenceDTO | null>(null);
  const [enrollSeq, setEnrollSeq] = useState("");
  const [enrollClientId, setEnrollClientId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const templateName = (id: string) =>
    templates.find((t) => t.id === id)?.name ?? "(deleted template)";

  function create(): void {
    if (!newName.trim()) return;
    startTransition(async () => {
      await addSequence(newName);
      setNewName("");
    });
  }

  function startEdit(s: SequenceDTO): void {
    setEditId(s.id);
    setDraft({ ...s, steps: [...s.steps] });
  }

  function save(): void {
    if (!draft) return;
    startTransition(async () => {
      await saveSequence({
        id: draft.id,
        name: draft.name,
        status: draft.status,
        steps: draft.steps,
      });
      setEditId(null);
      setDraft(null);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this sequence?")) return;
    startTransition(async () => {
      await removeSequence(id);
    });
  }

  function runEnroll(): void {
    if (!enrollSeq || !enrollClientId) return;
    setStatus(null);
    startTransition(async () => {
      const r = await enroll(enrollSeq, enrollClientId);
      setStatus(r.message);
      if (r.ok) setEnrollClientId("");
    });
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Sequences */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Sequences
          </h2>
          <span className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New sequence name"
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
          {sequences.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
              No sequences yet.
            </p>
          ) : (
            sequences.map((s) => {
              const isEdit = editId === s.id && draft;
              return (
                <div
                  key={s.id}
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
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDraft({ ...draft, status: e.target.value })
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      >
                        <option value="draft">draft</option>
                        <option value="active">active</option>
                        <option value="archived">archived</option>
                      </select>
                      <div className="space-y-2">
                        {draft.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              Step {i + 1}
                            </span>
                            <select
                              value={step.templateId}
                              onChange={(e) => {
                                const steps = [...draft.steps];
                                steps[i] = {
                                  ...steps[i]!,
                                  templateId: e.target.value,
                                };
                                setDraft({ ...draft, steps });
                              }}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500"
                            >
                              <option value="">Select template…</option>
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              value={step.delayDays}
                              onChange={(e) => {
                                const steps = [...draft.steps];
                                steps[i] = {
                                  ...steps[i]!,
                                  delayDays: Math.max(
                                    0,
                                    Number(e.target.value) || 0,
                                  ),
                                };
                                setDraft({ ...draft, steps });
                              }}
                              className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500"
                            />
                            <span className="text-xs text-gray-400">
                              days after prior
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  steps: draft.steps.filter(
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
                              steps: [
                                ...draft.steps,
                                { templateId: "", delayDays: 3 },
                              ],
                            })
                          }
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          + Add step
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
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status] ?? "bg-gray-100 text-gray-500"}`}
                        >
                          {s.status}
                        </span>
                        <span className="font-medium">{s.name}</span>
                        <span className="text-sm text-gray-400">
                          {s.steps.length} step
                          {s.steps.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(s.id)}
                          disabled={pending}
                          className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </span>
                    </div>
                  )}
                  {!isEdit && s.steps.length > 0 ? (
                    <ol className="mt-2 list-inside list-decimal text-xs text-gray-500">
                      {s.steps.map((step, i) => (
                        <li key={i}>
                          {templateName(step.templateId)} — day{" "}
                          {step.delayDays}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Enroll */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Enroll a client
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={enrollSeq}
            onChange={(e) => setEnrollSeq(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Sequence…</option>
            {sequences
              .filter((s) => s.status === "active")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          <select
            value={enrollClientId}
            onChange={(e) => setEnrollClientId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={runEnroll}
            disabled={pending || !enrollSeq || !enrollClientId}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            Enroll
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Only active sequences can take enrollments.
        </p>
        {status ? (
          <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700">
            {status}
          </p>
        ) : null}
        <div className="mt-3 space-y-1.5">
          {enrollments.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{e.clientName}</span>
                <span className="ml-2 text-gray-500">{e.sequenceName}</span>
                <span className="ml-2 text-xs text-gray-400">
                  step {e.currentStep + 1} · {e.status}
                  {e.nextSendAt ? ` · next ${fmt(e.nextSendAt)}` : ""}
                </span>
              </span>
              {e.status === "active" ? (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await cancelEnroll(e.id);
                    })
                  }
                  disabled={pending}
                  className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Recent sends */}
      {sends.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent sends
          </h2>
          <div className="mt-3 space-y-1">
            {sends.map((s) => (
              <p key={s.id} className="text-xs text-gray-500">
                {fmt(s.sentAt)} · {s.toEmail} · {s.subject || "(no subject)"} ·{" "}
                {s.source} ·{" "}
                <span
                  className={
                    s.status === "sent" ? "text-green-600" : "text-rose-600"
                  }
                >
                  {s.status}
                </span>
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
