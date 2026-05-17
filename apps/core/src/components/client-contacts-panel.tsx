"use client";

import { useState, useTransition } from "react";
import {
  newClientContact,
  editClientContact,
  removeClientContact,
} from "@/app/(shell)/m/clients/contacts/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";

export interface ClientOption {
  id: string;
  label: string;
}

export interface ClientContactDTO {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role: "primary" | "billing" | "claims" | "decision_maker" | "other";
  notes: string;
}

const ROLE_LABEL: Record<ClientContactDTO["role"], string> = {
  primary: "Primary",
  billing: "Billing",
  claims: "Claims",
  decision_maker: "Decision maker",
  other: "Other",
};

const EMPTY = {
  clientId: "",
  name: "",
  title: "",
  email: "",
  phone: "",
  role: "primary",
  notes: "",
};

const CSV_COLUMNS: CsvColumn<ClientContactDTO>[] = [
  { header: "Client", cell: (c) => c.clientName },
  { header: "Name", cell: (c) => c.name },
  { header: "Title", cell: (c) => c.title },
  { header: "Role", cell: (c) => ROLE_LABEL[c.role] },
  { header: "Email", cell: (c) => c.email },
  { header: "Phone", cell: (c) => c.phone },
  { header: "Notes", cell: (c) => c.notes },
];

export function ClientContactsPanel({
  contacts,
  clients,
}: {
  contacts: ClientContactDTO[];
  clients: ClientOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [query, setQuery] = useState("");

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startCreate(): void {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(c: ClientContactDTO): void {
    setForm({
      clientId: c.clientId,
      name: c.name,
      title: c.title,
      email: c.email,
      phone: c.phone,
      role: c.role,
      notes: c.notes,
    });
    setEditingId(c.id);
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
        await editClientContact({
          id: editingId,
          ...form,
          role: form.role as ClientContactDTO["role"],
        });
      } else {
        await newClientContact({
          ...form,
          role: form.role as ClientContactDTO["role"],
        });
      }
      close();
    });
  }

  function remove(c: ClientContactDTO): void {
    if (!confirm(`Delete contact "${c.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await removeClientContact(c.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? contacts.filter((c) =>
        [c.name, c.clientName, c.title, c.email, c.phone]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : contacts;

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() =>
              exportRowsToCsv("client-contacts", CSV_COLUMNS, visible)
            }
          />
        </div>
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New contact
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700">
            {editingId ? "Edit contact" : "New contact"}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Client
              <select
                value={form.clientId}
                onChange={(e) => set("clientId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Role
              <select
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className={inputClass}
              >
                <option value="primary">Primary</option>
                <option value="billing">Billing</option>
                <option value="claims">Claims</option>
                <option value="decision_maker">Decision maker</option>
                <option value="other">Other</option>
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
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.clientId || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Update contact"
                  : "Save contact"}
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
            {clients.length === 0
              ? "Add a client first, then record its contacts."
              : contacts.length === 0
                ? "No contacts yet."
                : "No contacts match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Reach</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.clientName}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{c.name}</span>
                    {c.title ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {c.title}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ROLE_LABEL[c.role]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.email || c.phone ? (
                      <>
                        {c.email}
                        {c.email && c.phone ? " · " : ""}
                        {c.phone}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(c)}
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
