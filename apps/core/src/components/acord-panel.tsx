"use client";

import { useState, useTransition } from "react";
import { addAcordForm, advanceAcord } from "@/app/(shell)/m/acord_forms/actions";

export interface AcordFormDTO {
  id: string;
  formType: string;
  clientName: string;
  notes: string;
  status: string;
}

export interface ClientOption {
  id: string;
  name: string;
}

const FORM_TYPES = [
  "ACORD 125 — Commercial Application",
  "ACORD 126 — Commercial General Liability",
  "ACORD 127 — Business Auto",
  "ACORD 130 — Workers Compensation",
  "ACORD 140 — Property",
  "ACORD 25 — Certificate of Liability",
  "Other",
];

const STATUSES = ["draft", "completed", "submitted"] as const;
type Status = (typeof STATUSES)[number];

const STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  completed: "bg-amber-50 text-amber-700",
  submitted: "bg-green-50 text-green-700",
};

export function AcordPanel({
  forms,
  clients,
}: {
  forms: AcordFormDTO[];
  clients: ClientOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [formType, setFormType] = useState<string>(FORM_TYPES[0] ?? "");
  const [status, setStatus] = useState<Status>("draft");
  const [notes, setNotes] = useState("");

  function submit(): void {
    startTransition(async () => {
      await addAcordForm({ clientId, formType, status, notes });
      setClientId("");
      setFormType(FORM_TYPES[0] ?? "");
      setStatus("draft");
      setNotes("");
      setShowForm(false);
    });
  }

  function changeStatus(id: string, next: Status): void {
    startTransition(async () => {
      await advanceAcord(id, next);
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
          {forms.length} form{forms.length === 1 ? "" : "s"}
        </p>
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New ACORD form
          </button>
        ) : null}
      </div>

      {clients.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a client first — an ACORD form is prepared for a client.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
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
              Form type
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className={inputClass}
              >
                {FORM_TYPES.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !clientId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save form"}
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
        {forms.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No ACORD forms yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Form</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forms.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3 font-medium">{f.formType}</td>
                  <td className="px-4 py-3 text-gray-600">{f.clientName}</td>
                  <td className="px-4 py-3 text-gray-500">{f.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={f.status}
                      onChange={(e) =>
                        changeStatus(f.id, e.target.value as Status)
                      }
                      disabled={pending}
                      aria-label="ACORD form status"
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STYLE[f.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
