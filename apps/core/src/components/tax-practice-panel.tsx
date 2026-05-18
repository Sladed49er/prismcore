"use client";

import { useState, useTransition } from "react";
import {
  newTaxEngagement,
  editTaxEngagement,
  updateTaxEngagementStatus,
  removeTaxEngagement,
  type TaxEngagementForm,
} from "@/app/(shell)/m/tax_practice/actions";

export interface TaxEngagementDTO {
  id: string;
  clientName: string;
  taxYear: number;
  engagementType:
    | "form_1040"
    | "form_1120"
    | "form_1120s"
    | "form_1065"
    | "form_990"
    | "other";
  status: "not_started" | "in_progress" | "in_review" | "filed" | "extended";
  dueDate: string | null;
  feeCents: number;
  preparerName: string;
  notes: string;
}

const TYPES = [
  "form_1040",
  "form_1120",
  "form_1120s",
  "form_1065",
  "form_990",
  "other",
] as const;
const STATUSES = [
  "not_started",
  "in_progress",
  "in_review",
  "filed",
  "extended",
] as const;

const TYPE_LABEL: Record<TaxEngagementDTO["engagementType"], string> = {
  form_1040: "1040 — Individual",
  form_1120: "1120 — C-Corp",
  form_1120s: "1120-S — S-Corp",
  form_1065: "1065 — Partnership",
  form_990: "990 — Nonprofit",
  other: "Other",
};

const STATUS_COLOR: Record<TaxEngagementDTO["status"], string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-50 text-blue-700",
  in_review: "bg-amber-50 text-amber-700",
  filed: "bg-emerald-50 text-emerald-700",
  extended: "bg-violet-50 text-violet-700",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY: TaxEngagementForm = {
  clientName: "",
  taxYear: String(new Date().getFullYear() - 1),
  engagementType: "form_1040",
  status: "not_started",
  dueDate: "",
  feeDollars: "",
  preparerName: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function TaxPracticePanel({
  engagements,
}: {
  engagements: TaxEngagementDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TaxEngagementForm>({ ...EMPTY });

  function set<K extends keyof TaxEngagementForm>(
    key: K,
    value: TaxEngagementForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(e: TaxEngagementDTO): void {
    setEditId(e.id);
    setForm({
      clientName: e.clientName,
      taxYear: String(e.taxYear),
      engagementType: e.engagementType,
      status: e.status,
      dueDate: e.dueDate ?? "",
      feeDollars: e.feeCents ? String(e.feeCents / 100) : "",
      preparerName: e.preparerName,
      notes: e.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editTaxEngagement({ id: editId, ...form });
      else await newTaxEngagement(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: TaxEngagementDTO["status"]): void {
    startTransition(async () => {
      await updateTaxEngagementStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this engagement?")) return;
    startTransition(async () => {
      await removeTaxEngagement(id);
    });
  }

  const open = engagements.filter(
    (e) => e.status !== "filed",
  ).length;
  const fees = engagements.reduce((s, e) => s + e.feeCents, 0);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {engagements.length} engagement{engagements.length === 1 ? "" : "s"} ·{" "}
          {open} open · {money(fees)} fees
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New engagement
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Client
              <input
                value={form.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Tax year
              <input
                type="number"
                value={form.taxYear}
                onChange={(e) => set("taxYear", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Return type
              <select
                value={form.engagementType}
                onChange={(e) => set("engagementType", e.target.value)}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
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
              Due date
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Fee ($)
              <input
                type="number"
                value={form.feeDollars}
                onChange={(e) => set("feeDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Preparer
              <input
                value={form.preparerName}
                onChange={(e) => set("preparerName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
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
              disabled={pending || !form.clientName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editId
                  ? "Save changes"
                  : "Save engagement"}
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

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {engagements.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No tax engagements yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Return</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Fee</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {engagements.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{e.clientName}</span>
                    {e.preparerName ? (
                      <span className="block text-xs text-gray-400">
                        Preparer: {e.preparerName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[e.engagementType]}
                    <span className="block text-xs text-gray-400">
                      TY {e.taxYear}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(e.feeCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={e.status}
                      disabled={pending}
                      onChange={(ev) =>
                        changeStatus(
                          e.id,
                          ev.target.value as TaxEngagementDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[e.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        disabled={pending}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        Delete
                      </button>
                    </div>
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
