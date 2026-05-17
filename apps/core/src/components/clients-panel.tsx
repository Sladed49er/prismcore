"use client";

import { useState, useTransition } from "react";
import { addClient } from "@/app/(shell)/m/clients/actions";

export interface ClientDTO {
  id: string;
  type: "person" | "business";
  displayName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  status: string;
}

export interface CustomFieldDTO {
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  prospect: "bg-amber-50 text-amber-700",
  active: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
};

const EMPTY = {
  firstName: "",
  lastName: "",
  businessName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  status: "prospect",
};

export function ClientsPanel({
  clients,
  customFields,
}: {
  clients: ClientDTO[];
  customFields: CustomFieldDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"person" | "business">("person");
  const [form, setForm] = useState({ ...EMPTY });
  const [custom, setCustom] = useState<Record<string, string>>({});

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addClient({
        type,
        firstName: form.firstName,
        lastName: form.lastName,
        businessName: form.businessName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        state: form.state,
        status: form.status as "prospect" | "active" | "inactive",
        customValues: custom,
      });
      setForm({ ...EMPTY });
      setCustom({});
      setType("person");
      setShowForm(false);
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {clients.length} client{clients.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New client
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex gap-2">
            {(["person", "business"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition ${
                  type === t
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {type === "person" ? (
              <>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  First name
                  <input
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Last name
                  <input
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    className={inputClass}
                  />
                </label>
              </>
            ) : (
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:col-span-2">
                Business name
                <input
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  className={inputClass}
                />
              </label>
            )}
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Email
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Phone
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              City
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              State
              <input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                <option value="prospect">prospect</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>

          {customFields.length > 0 ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Your custom fields
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {customFields.map((f) => (
                  <label
                    key={f.fieldKey}
                    className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {f.label}
                    {f.required ? " *" : ""}
                    {f.fieldType === "checkbox" ? (
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          checked={custom[f.fieldKey] === "true"}
                          onChange={(e) =>
                            setCustom((c) => ({
                              ...c,
                              [f.fieldKey]: e.target.checked ? "true" : "false",
                            }))
                          }
                        />
                      </div>
                    ) : (
                      <input
                        type={
                          f.fieldType === "number"
                            ? "number"
                            : f.fieldType === "date"
                              ? "date"
                              : "text"
                        }
                        value={custom[f.fieldKey] ?? ""}
                        onChange={(e) =>
                          setCustom((c) => ({
                            ...c,
                            [f.fieldKey]: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save client"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm({ ...EMPTY });
                setCustom({});
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {clients.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No clients yet. Add your first one above.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{c.displayName}</span>
                    <span className="ml-2 text-xs text-gray-400">{c.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.email ?? c.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.location ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {c.status}
                    </span>
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
