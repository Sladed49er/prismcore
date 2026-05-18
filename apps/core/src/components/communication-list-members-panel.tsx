"use client";

import { useState, useTransition } from "react";
import {
  newListMember,
  removeListMember,
  type ListMemberForm,
} from "@/app/(shell)/m/communication_lists/actions";

export interface ListMemberDTO {
  id: string;
  listName: string;
  name: string;
  email: string;
  role: string;
}

export interface ListOption {
  id: string;
  name: string;
}

const EMPTY: ListMemberForm = {
  listId: "",
  name: "",
  email: "",
  role: "member",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function CommunicationListMembersPanel({
  members,
  lists,
}: {
  members: ListMemberDTO[];
  lists: ListOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ListMemberForm>({ ...EMPTY });

  function set<K extends keyof ListMemberForm>(
    key: K,
    value: ListMemberForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newListMember(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeListMember(id);
    });
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {members.length} list member{members.length === 1 ? "" : "s"}
        </p>
        {!showForm && lists.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + Add to a list
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              List
              <select
                value={form.listId}
                onChange={(e) => set("listId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a list…</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
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
              Email
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Role
              <input
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="member · chair · admin"
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.listId || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Add member"}
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
        {members.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {lists.length === 0
              ? "Create a list first, then add members to it."
              : "No list members yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">List</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{m.name}</span>
                    {m.email ? (
                      <span className="block text-xs text-gray-400">
                        {m.email}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.listName}</td>
                  <td className="px-4 py-3 text-gray-600">{m.role}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      disabled={pending}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Remove
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
