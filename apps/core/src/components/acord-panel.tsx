"use client";

import { useState, useTransition } from "react";
import {
  prepareForm,
  saveForm,
  removeForm,
} from "@/app/(shell)/m/acord_forms/actions";

export interface AcordFormDTO {
  id: string;
  formType: string;
  clientName: string;
  status: string;
  notes: string;
  fieldValues: Record<string, string>;
}
export interface ClientOption {
  id: string;
  name: string;
}
export interface PolicyOption {
  id: string;
  label: string;
}
export interface FormCatalogEntry {
  type: string;
  name: string;
  description: string;
  fields: { key: string; label: string }[];
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  submitted: "bg-indigo-50 text-indigo-700",
};
const STATUSES = ["draft", "completed", "submitted"] as const;
type Status = (typeof STATUSES)[number];

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function AcordPanel({
  forms,
  clients,
  policies,
  catalog,
}: {
  forms: AcordFormDTO[];
  clients: ClientOption[];
  policies: PolicyOption[];
  catalog: FormCatalogEntry[];
}) {
  const [pending, startTransition] = useTransition();
  const [showPrepare, setShowPrepare] = useState(false);
  const [formType, setFormType] = useState(catalog[0]?.type ?? "");
  const [clientId, setClientId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [prepNotes, setPrepNotes] = useState("");

  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    values: Record<string, string>;
    status: Status;
    notes: string;
  } | null>(null);

  function prepare(): void {
    if (!clientId || !formType) return;
    startTransition(async () => {
      await prepareForm({
        clientId,
        policyId: policyId || null,
        formType,
        notes: prepNotes,
      });
      setShowPrepare(false);
      setClientId("");
      setPolicyId("");
      setPrepNotes("");
    });
  }

  function open(f: AcordFormDTO): void {
    if (openId === f.id) {
      setOpenId(null);
      setDraft(null);
      return;
    }
    setOpenId(f.id);
    setDraft({
      values: { ...f.fieldValues },
      status: (STATUSES as readonly string[]).includes(f.status)
        ? (f.status as Status)
        : "draft",
      notes: f.notes,
    });
  }

  function save(id: string): void {
    if (!draft) return;
    startTransition(async () => {
      await saveForm({
        id,
        status: draft.status,
        fieldValues: draft.values,
        notes: draft.notes,
      });
      setOpenId(null);
      setDraft(null);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this prepared form?")) return;
    startTransition(async () => {
      await removeForm(id);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {forms.length} prepared form{forms.length === 1 ? "" : "s"}
        </p>
        {!showPrepare ? (
          <button
            type="button"
            onClick={() => setShowPrepare(true)}
            disabled={clients.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            + Prepare a form
          </button>
        ) : null}
      </div>

      {showPrepare ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              ACORD form
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className={inputClass}
              >
                {catalog.map((c) => (
                  <option key={c.type} value={c.type}>
                    {c.type} — {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Client
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Policy (optional — prefills coverage data)
              <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                className={inputClass}
              >
                <option value="">None</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Notes
              <input
                value={prepNotes}
                onChange={(e) => setPrepNotes(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {catalog.find((c) => c.type === formType)?.description}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={prepare}
              disabled={pending || !clientId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Preparing…" : "Prepare & prefill"}
            </button>
            <button
              type="button"
              onClick={() => setShowPrepare(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        {forms.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No ACORD forms prepared yet.
          </p>
        ) : (
          forms.map((f) => {
            const entry = catalog.find((c) => c.type === f.formType);
            const isOpen = openId === f.id;
            return (
              <div
                key={f.id}
                className="rounded-xl border border-gray-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => open(f)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[f.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {f.status}
                    </span>
                    <span className="font-medium">{f.formType}</span>
                    <span className="text-sm text-gray-500">
                      {entry?.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {f.clientName}
                  </span>
                </button>
                {isOpen && draft ? (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-xs text-gray-500">
                      Fields prefilled from live client and policy data — edit
                      any value before completing.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(entry?.fields ?? []).map((field) => (
                        <label key={field.key} className={labelClass}>
                          {field.label}
                          <input
                            value={draft.values[field.key] ?? ""}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                values: {
                                  ...draft.values,
                                  [field.key]: e.target.value,
                                },
                              })
                            }
                            className={inputClass}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className={labelClass}>
                        Status
                        <select
                          value={draft.status}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              status: e.target.value as Status,
                            })
                          }
                          className={inputClass}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={labelClass}>
                        Notes
                        <input
                          value={draft.notes}
                          onChange={(e) =>
                            setDraft({ ...draft, notes: e.target.value })
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => save(f.id)}
                        disabled={pending}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
                      >
                        {pending ? "Saving…" : "Save form"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(f.id)}
                        disabled={pending}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
