"use client";

import { useState, useTransition } from "react";
import { addEmployee } from "@/app/(shell)/m/accounting/employees/actions";

export interface EmployeeDTO {
  id: string;
  name: string;
  title: string;
  email: string;
  employmentType: string;
  periodPayCents: number;
  isActive: boolean;
}

const EMPTY = {
  name: "",
  email: "",
  title: "",
  employmentType: "w2",
  payDollars: "",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

export function EmployeesPanel({ employees }: { employees: EmployeeDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addEmployee({
        name: form.name,
        email: form.email,
        title: form.title,
        employmentType: form.employmentType as "w2" | "contractor",
        payDollars: form.payDollars,
      });
      setForm({ ...EMPTY });
      setShowForm(false);
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
          {employees.length} employee{employees.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New employee
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
              Title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputClass}
              />
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
              Employment type
              <select
                value={form.employmentType}
                onChange={(e) => set("employmentType", e.target.value)}
                className={inputClass}
              >
                <option value="w2">W-2 employee</option>
                <option value="contractor">1099 contractor</option>
              </select>
            </label>
            <label className={labelClass}>
              Pay per period ($)
              <input
                type="number"
                value={form.payDollars}
                onChange={(e) => set("payDollars", e.target.value)}
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
              {pending ? "Saving…" : "Save employee"}
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
        {employees.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No employees yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Pay / period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((e) => (
                <tr key={e.id} className={e.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-gray-500">{e.title || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.employmentType === "w2" ? "W-2" : "1099"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(e.periodPayCents)}
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
