"use client";

import { useState, useTransition } from "react";
import { newClientLocation } from "@/app/(shell)/m/clients/locations/actions";

export interface ClientOption {
  id: string;
  label: string;
}

export interface ClientLocationDTO {
  id: string;
  clientName: string;
  label: string;
  locationType: "mailing" | "physical" | "billing" | "branch";
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
}

const TYPE_LABEL: Record<ClientLocationDTO["locationType"], string> = {
  mailing: "Mailing",
  physical: "Physical",
  billing: "Billing",
  branch: "Branch",
};

const EMPTY = {
  clientId: "",
  label: "",
  locationType: "physical",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
};

export function ClientLocationsPanel({
  locations,
  clients,
}: {
  locations: ClientLocationDTO[];
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
      await newClientLocation({
        ...form,
        locationType:
          form.locationType as ClientLocationDTO["locationType"],
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
          {locations.length} location{locations.length === 1 ? "" : "s"}
        </p>
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New location
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
              Location type
              <select
                value={form.locationType}
                onChange={(e) => set("locationType", e.target.value)}
                className={inputClass}
              >
                <option value="physical">Physical</option>
                <option value="mailing">Mailing</option>
                <option value="billing">Billing</option>
                <option value="branch">Branch</option>
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Label
              <input
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                placeholder="e.g. Headquarters, Warehouse #2"
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Address
              <input
                value={form.addressLine}
                onChange={(e) => set("addressLine", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              City
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              State
              <input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Postal code
              <input
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.clientId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save location"}
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
        {locations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {clients.length === 0
              ? "Add a client first, then record its locations."
              : "No locations yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {locations.map((l) => {
                const cityState = [l.city, l.state]
                  .filter(Boolean)
                  .join(", ");
                const full = [l.addressLine, cityState, l.postalCode]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={l.id}>
                    <td className="px-4 py-3 font-medium">{l.clientName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {l.label || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {TYPE_LABEL[l.locationType]}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {full || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
