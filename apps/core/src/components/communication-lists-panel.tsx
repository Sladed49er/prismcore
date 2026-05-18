"use client";

import { useState, useTransition } from "react";
import {
  newCommunicationList,
  editCommunicationList,
  toggleCommunicationListActive,
  removeCommunicationList,
  type CommunicationListForm,
} from "@/app/(shell)/m/communication_lists/actions";

export interface CommunicationListDTO {
  id: string;
  name: string;
  type: "committee" | "distribution" | "working_group" | "board";
  purpose: string;
  memberCount: number;
  ownerName: string;
  isActive: boolean;
  notes: string;
}

const TYPES = [
  "committee",
  "distribution",
  "working_group",
  "board",
] as const;

const TYPE_LABEL: Record<CommunicationListDTO["type"], string> = {
  committee: "Committee",
  distribution: "Distribution list",
  working_group: "Working group",
  board: "Board",
};

const EMPTY: CommunicationListForm = {
  name: "",
  type: "distribution",
  purpose: "",
  memberCount: "",
  ownerName: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function CommunicationListsPanel({
  lists,
}: {
  lists: CommunicationListDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CommunicationListForm>({ ...EMPTY });

  function set<K extends keyof CommunicationListForm>(
    key: K,
    value: CommunicationListForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(l: CommunicationListDTO): void {
    setEditId(l.id);
    setForm({
      name: l.name,
      type: l.type,
      purpose: l.purpose,
      memberCount: l.memberCount ? String(l.memberCount) : "",
      ownerName: l.ownerName,
      notes: l.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editCommunicationList({ id: editId, ...form });
      else await newCommunicationList(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this list?")) return;
    startTransition(async () => {
      await removeCommunicationList(id);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {lists.length} list{lists.length === 1 ? "" : "s"} ·{" "}
          {lists.filter((l) => l.isActive).length} active
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New list
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              List name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Type
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
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
              Owner / chair
              <input
                value={form.ownerName}
                onChange={(e) => set("ownerName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Member count
              <input
                type="number"
                value={form.memberCount}
                onChange={(e) => set("memberCount", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Purpose
              <input
                value={form.purpose}
                onChange={(e) => set("purpose", e.target.value)}
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
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save list"}
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

      <div className="mt-5 space-y-3">
        {lists.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No communication lists yet.
          </p>
        ) : (
          lists.map((l) => (
            <div
              key={l.id}
              className={`rounded-xl border bg-white p-5 ${
                l.isActive ? "border-gray-200" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {l.name}
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {TYPE_LABEL[l.type]}
                    </span>
                  </p>
                  {l.purpose ? (
                    <p className="mt-1 text-sm text-gray-600">{l.purpose}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-400">
                    {[
                      `${l.memberCount.toLocaleString()} members`,
                      l.ownerName && `Owner: ${l.ownerName}`,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await toggleCommunicationListActive({
                          id: l.id,
                          isActive: !l.isActive,
                        });
                      })
                    }
                    disabled={pending}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    {l.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(l)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(l.id)}
                    disabled={pending}
                    className="text-rose-600 hover:text-rose-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
