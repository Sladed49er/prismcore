"use client";

import { useState, useTransition } from "react";
import {
  newServiceActivity,
  updateServiceActivityStatus,
} from "@/app/(shell)/m/policies/service/actions";

export interface PolicyOption {
  id: string;
  label: string;
}

export interface ServiceActivityDTO {
  id: string;
  policyNumber: string;
  activityType:
    | "inquiry"
    | "change_request"
    | "coverage_review"
    | "claim_follow_up"
    | "document_request"
    | "other";
  subject: string;
  detail: string;
  assignedTo: string;
  dueDate: string | null;
  status: "open" | "in_progress" | "completed";
}

const TYPE_LABEL: Record<ServiceActivityDTO["activityType"], string> = {
  inquiry: "Inquiry",
  change_request: "Change request",
  coverage_review: "Coverage review",
  claim_follow_up: "Claim follow-up",
  document_request: "Document request",
  other: "Other",
};

const STATUS_COLOR: Record<ServiceActivityDTO["status"], string> = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
};

const EMPTY = {
  policyId: "",
  activityType: "inquiry",
  subject: "",
  detail: "",
  assignedTo: "",
  dueDate: "",
};

export function ServiceActivitiesPanel({
  activities,
  policies,
}: {
  activities: ServiceActivityDTO[];
  policies: PolicyOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newServiceActivity({
        ...form,
        activityType:
          form.activityType as ServiceActivityDTO["activityType"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: ServiceActivityDTO["status"],
  ): void {
    startTransition(async () => {
      await updateServiceActivityStatus({ id, status });
    });
  }

  const open = activities.filter((a) => a.status !== "completed").length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {activities.length} activit{activities.length === 1 ? "y" : "ies"} ·{" "}
          {open} open
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Log activity
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Policy
              <select
                value={form.policyId}
                onChange={(e) => set("policyId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a policy…</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Activity type
              <select
                value={form.activityType}
                onChange={(e) => set("activityType", e.target.value)}
                className={inputClass}
              >
                <option value="inquiry">Inquiry</option>
                <option value="change_request">Change request</option>
                <option value="coverage_review">Coverage review</option>
                <option value="claim_follow_up">Claim follow-up</option>
                <option value="document_request">Document request</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className={labelClass}>
              Assigned to
              <input
                value={form.assignedTo}
                onChange={(e) => set("assignedTo", e.target.value)}
                className={inputClass}
              />
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
            <label className={`${labelClass} sm:col-span-2`}>
              Subject
              <input
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Detail
              <input
                value={form.detail}
                onChange={(e) => set("detail", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.policyId || !form.subject.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save activity"}
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
        {activities.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {policies.length === 0
              ? "Add a policy first, then log its servicing activity."
              : "No service activity logged yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Assigned</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{a.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[a.activityType]}
                  </td>
                  <td className="px-4 py-3">
                    <span>{a.subject}</span>
                    {a.detail ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {a.detail}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.assignedTo || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          a.id,
                          e.target.value as ServiceActivityDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[a.status]}`}
                    >
                      <option value="open">open</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
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
