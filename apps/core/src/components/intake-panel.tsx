"use client";

import { useState, useTransition } from "react";
import { addIntake, advanceIntake } from "@/app/(shell)/m/intake_forms/actions";

export interface IntakeDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  status: string;
}

const STATUSES = ["new", "contacted", "converted"] as const;
type Status = (typeof STATUSES)[number];

const STYLE: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-amber-50 text-amber-700",
  converted: "bg-green-50 text-green-700",
};

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  interest: "",
  status: "new",
};

export function IntakePanel({ submissions }: { submissions: IntakeDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addIntake({
        name: form.name,
        email: form.email,
        phone: form.phone,
        interest: form.interest,
        status: form.status as Status,
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: Status): void {
    startTransition(async () => {
      await advanceIntake(id, status);
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
          {submissions.length} submission
          {submissions.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Log a submission
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
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
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Email
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Interest
              <input
                value={form.interest}
                onChange={(e) => set("interest", e.target.value)}
                placeholder="What the prospect is looking for"
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
              {pending ? "Saving…" : "Save submission"}
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
        {submissions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No intake submissions yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Interest</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.email || s.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.interest || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={s.status}
                      onChange={(e) =>
                        changeStatus(s.id, e.target.value as Status)
                      }
                      disabled={pending}
                      aria-label="Submission status"
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STYLE[s.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUSES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
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
