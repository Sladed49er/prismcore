"use client";

import { useState, useTransition } from "react";
import type { SignField } from "@prismcore/db";
import {
  createRequest,
  updateRequest,
  sendRequest,
  removeRequest,
} from "@/app/(shell)/m/esign/actions";

export interface SignatureRequestDTO {
  id: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  body: string;
  fields: SignField[];
  status: string;
  publicToken: string;
  signedName: string | null;
  signedAt: string | null;
  signedValues: Record<string, string> | null;
  declinedReason: string;
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-amber-50 text-amber-700",
  signed: "bg-green-50 text-green-700",
  declined: "bg-rose-50 text-rose-700",
};
const FIELD_TYPES = ["signature", "initials", "date", "text"];

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

interface Draft {
  documentName: string;
  signerName: string;
  signerEmail: string;
  body: string;
  fields: SignField[];
}

const EMPTY: Draft = {
  documentName: "",
  signerName: "",
  signerEmail: "",
  body: "",
  fields: [
    { key: "signature", label: "Signature", type: "signature", required: true },
    { key: "date", label: "Date", type: "date", required: true },
  ],
};

export function EsignPanel({
  requests,
  baseUrl,
}: {
  requests: SignatureRequestDTO[];
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [status, setStatus] = useState<string | null>(null);

  function startNew(): void {
    setEditId(null);
    setShowNew(true);
    setDraft({ ...EMPTY, fields: EMPTY.fields.map((f) => ({ ...f })) });
  }
  function startEdit(r: SignatureRequestDTO): void {
    setShowNew(false);
    setEditId(r.id);
    setDraft({
      documentName: r.documentName,
      signerName: r.signerName,
      signerEmail: r.signerEmail,
      body: r.body,
      fields: r.fields.map((f) => ({ ...f })),
    });
  }
  function reset(): void {
    setEditId(null);
    setShowNew(false);
  }

  function save(): void {
    if (!draft.documentName.trim() || !draft.signerName.trim()) return;
    startTransition(async () => {
      if (editId) await updateRequest({ id: editId, ...draft });
      else await createRequest(draft);
      reset();
    });
  }

  function send(id: string): void {
    setStatus(null);
    startTransition(async () => {
      const r = await sendRequest(id);
      setStatus(r.message);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this signature request?")) return;
    startTransition(async () => {
      await removeRequest(id);
    });
  }

  function setField(i: number, patch: Partial<SignField>): void {
    setDraft({
      ...draft,
      fields: draft.fields.map((f, idx) =>
        idx === i ? { ...f, ...patch } : f,
      ),
    });
  }

  const editing = showNew || editId !== null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {requests.length} request{requests.length === 1 ? "" : "s"}
        </p>
        {!editing ? (
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New signature request
          </button>
        ) : null}
      </div>

      {status ? (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700">
          {status}
        </p>
      ) : null}

      {editing ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Document name
              <input
                value={draft.documentName}
                onChange={(e) =>
                  setDraft({ ...draft, documentName: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Signer name
              <input
                value={draft.signerName}
                onChange={(e) =>
                  setDraft({ ...draft, signerName: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Signer email
              <input
                type="email"
                value={draft.signerEmail}
                onChange={(e) =>
                  setDraft({ ...draft, signerEmail: e.target.value })
                }
                className={inputClass}
              />
            </label>
          </div>
          <label className={`${labelClass} mt-3 block`}>
            Agreement text (what the signer reads and signs)
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={8}
              className={inputClass}
            />
          </label>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Signing fields
          </p>
          <div className="mt-1 space-y-2">
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
                  onChange={(e) => setField(i, { type: e.target.value })}
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
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      fields: draft.fields.filter((_, idx) => idx !== i),
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
                    { key: "", label: "", type: "text", required: false },
                  ],
                })
              }
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              + Add field
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={
                pending ||
                !draft.documentName.trim() ||
                !draft.signerName.trim()
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save request"}
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

      <div className="mt-5 space-y-2">
        {requests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No signature requests yet.
          </p>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-500"}`}
                  >
                    {r.status}
                  </span>
                  <span className="font-medium">{r.documentName}</span>
                  <span className="text-sm text-gray-500">{r.signerName}</span>
                </span>
                <span className="flex gap-3">
                  {r.status === "draft" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => send(r.id)}
                        disabled={pending}
                        className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50"
                      >
                        Send
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    disabled={pending}
                    className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </span>
              </div>
              {r.status === "sent" ? (
                <p className="mt-2 text-xs text-gray-500">
                  Signing link:{" "}
                  <a
                    href={`${baseUrl}/sign/${r.publicToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {baseUrl}/sign/{r.publicToken}
                  </a>
                </p>
              ) : null}
              {r.status === "signed" ? (
                <p className="mt-2 text-xs text-green-700">
                  Signed by {r.signedName}
                  {r.signedAt
                    ? ` on ${new Date(r.signedAt).toLocaleString()}`
                    : ""}
                </p>
              ) : null}
              {r.status === "declined" ? (
                <p className="mt-2 text-xs text-rose-700">
                  Declined{r.declinedReason ? ` — ${r.declinedReason}` : ""}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
