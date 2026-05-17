"use client";

import { useState, useTransition } from "react";
import { newClientContact } from "@/app/(shell)/m/clients/contacts/actions";

export interface ClientOption {
  id: string;
  label: string;
}

export interface ClientContactDTO {
  id: string;
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

export function ClientContactsPanel({
  contacts,
  clients,
}: {
  contacts: ClientContactDTO[];
  clients: ClientOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newClientContact({
        ...form,
        role: form.role as ClientContactDTO["role"],
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
          {contacts.length} contact{contacts.length === 1 ? "" : "s"}
        </p>
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New contact
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
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
              {pending ? "Saving…" : "Save contact"}
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
        {contacts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {clients.length === 0
              ? "Add a client first, then record its contacts."
              : "No contacts yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Reach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
