"use client";

import { useState, useTransition } from "react";
import {
  newCredential,
  editCredential,
  removeCredential,
  revealCredential,
} from "@/app/(shell)/m/vault/actions";

export interface VaultCredentialDTO {
  id: string;
  name: string;
  category: "carrier" | "banking" | "software" | "system" | "other";
  url: string;
  username: string;
  hasSecret: boolean;
  notes: string;
}

const CATEGORIES = [
  "carrier",
  "banking",
  "software",
  "system",
  "other",
] as const;

const CATEGORY_COLOR: Record<VaultCredentialDTO["category"], string> = {
  carrier: "bg-indigo-50 text-indigo-700",
  banking: "bg-emerald-50 text-emerald-700",
  software: "bg-blue-50 text-blue-700",
  system: "bg-amber-50 text-amber-700",
  other: "bg-gray-100 text-gray-600",
};

const EMPTY = {
  name: "",
  category: "other",
  url: "",
  username: "",
  secret: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function VaultPanel({
  credentials,
}: {
  credentials: VaultCredentialDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  /** id → revealed plaintext, while a secret is shown. */
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(c: VaultCredentialDTO): void {
    setEditId(c.id);
    setForm({
      name: c.name,
      category: c.category,
      url: c.url,
      username: c.username,
      secret: "",
      notes: c.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) {
        await editCredential({ id: editId, ...form });
      } else {
        await newCredential(form);
      }
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this credential? This cannot be undone.")) return;
    startTransition(async () => {
      await removeCredential(id);
    });
  }

  function toggleReveal(id: string): void {
    if (revealed[id] !== undefined) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
      return;
    }
    startTransition(async () => {
      const secret = await revealCredential(id);
      setRevealed((r) => ({ ...r, [id]: secret }));
    });
  }

  function copy(id: string): void {
    startTransition(async () => {
      const secret = revealed[id] ?? (await revealCredential(id));
      await navigator.clipboard.writeText(secret);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {credentials.length} credential
          {credentials.length === 1 ? "" : "s"} · encrypted at rest
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New credential
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
                placeholder="e.g. Progressive Agent Portal"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Category
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Login URL
              <input
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Username
              <input
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Password
              <input
                type="password"
                value={form.secret}
                onChange={(e) => set("secret", e.target.value)}
                placeholder={
                  editId ? "Leave blank to keep current password" : ""
                }
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
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save credential"}
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
        {credentials.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No credentials stored yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Username</th>
                <th className="px-4 py-3 font-semibold">Password</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {credentials.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{c.name}</span>
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-xs text-indigo-600 hover:underline"
                      >
                        {c.url}
                      </a>
                    ) : null}
                    {c.notes ? (
                      <span className="block text-xs text-gray-400">
                        {c.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLOR[c.category]}`}
                    >
                      {c.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.username || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.hasSecret ? (
                      <span className="font-mono text-gray-700">
                        {revealed[c.id] !== undefined
                          ? revealed[c.id] || "(empty)"
                          : "••••••••"}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      {c.hasSecret ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleReveal(c.id)}
                            disabled={pending}
                            className="text-gray-500 hover:text-gray-800"
                          >
                            {revealed[c.id] !== undefined ? "Hide" : "Reveal"}
                          </button>
                          <button
                            type="button"
                            onClick={() => copy(c.id)}
                            disabled={pending}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            {copied === c.id ? "Copied!" : "Copy"}
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
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
