"use client";

import { useState, useTransition } from "react";
import {
  addEmployee,
  editEmployee,
  removeEmployee,
} from "@/app/(shell)/m/accounting/employees/actions";

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
  isActive: true,
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

export function EmployeesPanel({ employees }: { employees: EmployeeDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [query, setQuery] = useState("");

  function set<K extends keyof typeof EMPTY>(
    key: K,
    value: (typeof EMPTY)[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startCreate(): void {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(e: EmployeeDTO): void {
    setForm({
      name: e.name,
      email: e.email,
      title: e.title,
      employmentType: e.employmentType,
      payDollars: String(e.periodPayCents / 100),
      isActive: e.isActive,
    });
    setEditingId(e.id);
    setShowForm(true);
  }

  function close(): void {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY });
  }

  function submit(): void {
    startTransition(async () => {
      if (editingId) {
        await editEmployee({
          id: editingId,
          name: form.name,
          email: form.email,
          title: form.title,
          employmentType: form.employmentType as "w2" | "contractor",
          payDollars: form.payDollars,
          isActive: form.isActive,
        });
      } else {
        await addEmployee({
          name: form.name,
          email: form.email,
          title: form.title,
          employmentType: form.employmentType as "w2" | "contractor",
          payDollars: form.payDollars,
        });
      }
      close();
    });
  }

  function remove(e: EmployeeDTO): void {
    if (!confirm(`Delete employee "${e.name}"? This cannot be undone.`))
      return;
    startTransition(async () => {
      await removeEmployee(e.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? employees.filter((e) =>
        [e.name, e.title, e.email].join(" ").toLowerCase().includes(q),
      )
    : employees;

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search employees…"
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        {!showForm ? (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New employee
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit employee" : "New employee"}
          </p>
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
            {editingId ? (
              <label className="flex items-center gap-2 pt-6 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                />
                Active
              </label>
            ) : null}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update employee"
                  : "Save employee"}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {employees.length === 0
              ? "No employees yet."
              : "No employees match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Pay / period</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((e) => (
                <tr key={e.id} className={e.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.title || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.employmentType === "w2" ? "W-2" : "1099"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(e.periodPayCents)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(e)}
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(e)}
                      className="ml-3 text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                    >
                      Delete
                    </button>
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
