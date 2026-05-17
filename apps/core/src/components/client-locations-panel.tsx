"use client";

import { useState, useTransition } from "react";
import {
  newClientLocation,
  editClientLocation,
  removeClientLocation,
} from "@/app/(shell)/m/clients/locations/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";

export interface ClientOption {
  id: string;
  label: string;
}

export interface ClientLocationDTO {
  id: string;
  clientId: string;
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

const CSV_COLUMNS: CsvColumn<ClientLocationDTO>[] = [
  { header: "Client", cell: (l) => l.clientName },
  { header: "Label", cell: (l) => l.label },
  { header: "Type", cell: (l) => TYPE_LABEL[l.locationType] },
  { header: "Address", cell: (l) => l.addressLine },
  { header: "City", cell: (l) => l.city },
  { header: "State", cell: (l) => l.state },
  { header: "Postal code", cell: (l) => l.postalCode },
];

export function ClientLocationsPanel({
  locations,
  clients,
}: {
  locations: ClientLocationDTO[];
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

  function startEdit(l: ClientLocationDTO): void {
    setForm({
      clientId: l.clientId,
      label: l.label,
      locationType: l.locationType,
      addressLine: l.addressLine,
      city: l.city,
      state: l.state,
      postalCode: l.postalCode,
    });
    setEditingId(l.id);
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
        await editClientLocation({
          id: editingId,
          ...form,
          locationType:
            form.locationType as ClientLocationDTO["locationType"],
        });
      } else {
        await newClientLocation({
          ...form,
          locationType:
            form.locationType as ClientLocationDTO["locationType"],
        });
      }
      close();
    });
  }

  function remove(l: ClientLocationDTO): void {
    if (!confirm(`Delete location "${l.label || l.addressLine}"?`)) return;
    startTransition(async () => {
      await removeClientLocation(l.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? locations.filter((l) =>
        [l.label, l.clientName, l.addressLine, l.city, l.state]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : locations;

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
            placeholder="Search locations…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() =>
              exportRowsToCsv("client-locations", CSV_COLUMNS, visible)
            }
          />
        </div>
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New location
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700">
            {editingId ? "Edit location" : "New location"}
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
              {pending
                ? "Saving…"
                : editingId
                  ? "Update location"
                  : "Save location"}
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
              ? "Add a client first, then record its locations."
              : locations.length === 0
                ? "No locations yet."
                : "No locations match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Address</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((l) => {
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
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(l)}
                        className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(l)}
                        className="ml-3 text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                      >
                        Delete
                      </button>
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
