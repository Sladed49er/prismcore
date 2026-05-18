"use client";

import { useState, useTransition } from "react";
import {
  newMember,
  editMember,
  removeMember,
  type HouseholdMemberForm,
} from "@/app/(shell)/m/households/actions";

export interface HouseholdMemberDTO {
  id: string;
  householdId: string;
  householdName: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  isPrimary: boolean;
  notes: string;
}

export interface HouseholdOption {
  id: string;
  name: string;
}

const EMPTY: HouseholdMemberForm = {
  householdId: "",
  name: "",
  relationship: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  isPrimary: false,
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function HouseholdMembersPanel({
  members,
  households,
}: {
  members: HouseholdMemberDTO[];
  households: HouseholdOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HouseholdMemberForm>({ ...EMPTY });

  function set<K extends keyof HouseholdMemberForm>(
    key: K,
    value: HouseholdMemberForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(m: HouseholdMemberDTO): void {
    setEditId(m.id);
    setForm({
      householdId: m.householdId,
      name: m.name,
      relationship: m.relationship,
      email: m.email,
      phone: m.phone,
      dateOfBirth: m.dateOfBirth ?? "",
      isPrimary: m.isPrimary,
      notes: m.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editMember({ id: editId, ...form });
      else await newMember(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this member?")) return;
    startTransition(async () => {
      await removeMember(id);
    });
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {members.length} member{members.length === 1 ? "" : "s"} across{" "}
          {households.length} household{households.length === 1 ? "" : "s"}
        </p>
        {!showForm && households.length > 0 ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + New member
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Household
              <select
                value={form.householdId}
                onChange={(e) => set("householdId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a household…</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Relationship
              <input
                value={form.relationship}
                onChange={(e) => set("relationship", e.target.value)}
                placeholder="e.g. spouse, child, trustee"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Date of birth
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
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
              Phone
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Notes
              <input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(e) => set("isPrimary", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Primary contact for the household
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.householdId || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save member"}
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
        {members.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {households.length === 0
              ? "Add a household first, then its members."
              : "No household members yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Household</th>
                <th className="px-4 py-3 font-semibold">Relationship</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{m.name}</span>
                    {m.isPrimary ? (
                      <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-600">
                        Primary
                      </span>
                    ) : null}
                    {m.email || m.phone ? (
                      <span className="block text-xs text-gray-500">
                        {[m.email, m.phone].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.householdName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.relationship || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(m.id)}
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
