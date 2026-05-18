"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState, useTransition } from "react";
import {
  addClient,
  editClient,
  removeClient,
} from "@/app/(shell)/m/clients/register/actions";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";
import { ExportCsvButton } from "@/components/export-csv-button";
import type { StatusOption } from "@/lib/status-options";
import { badgeClass } from "@/lib/badge-colors";
import {
  SavedViewBar,
  type SavedViewItem,
  type SavedViewConfig,
} from "@/components/saved-view-bar";

export interface ClientDTO {
  id: string;
  type: "person" | "business";
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  location: string | null;
  status: string;
  customValues: Record<string, string>;
}

export interface CustomFieldDTO {
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
}

export const STATUS_DEFAULTS: StatusOption[] = [
  { value: "prospect", label: "Prospect", color: "amber" },
  { value: "active", label: "Active", color: "green" },
  { value: "inactive", label: "Inactive", color: "gray" },
];

/** A renderable, sortable column on the client register. */
interface ClientColumn {
  key: string;
  label: string;
  sortValue: (c: ClientDTO) => string;
  cell: (c: ClientDTO) => ReactNode;
}

const ALL_COLUMN_KEYS = ["name", "type", "contact", "location", "status"];

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

const CSV_COLUMNS: CsvColumn<ClientDTO>[] = [
  { header: "Name", cell: (c) => c.displayName },
  { header: "Type", cell: (c) => c.type },
  { header: "First name", cell: (c) => c.firstName },
  { header: "Last name", cell: (c) => c.lastName },
  { header: "Business name", cell: (c) => c.businessName },
  { header: "Email", cell: (c) => c.email },
  { header: "Phone", cell: (c) => c.phone },
  { header: "City", cell: (c) => c.city },
  { header: "State", cell: (c) => c.state },
  { header: "Status", cell: (c) => c.status },
];

export function ClientsPanel({
  clients,
  customFields,
  statusOptions,
  savedViews,
}: {
  clients: ClientDTO[];
  customFields: CustomFieldDTO[];
  statusOptions: StatusOption[];
  savedViews: SavedViewItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<"person" | "business">("person");
  const [form, setForm] = useState({ ...EMPTY });
  const [custom, setCustom] = useState<Record<string, string>>({});

  // ── List-view state, seeded from the tenant's default saved view ────────
  const defaultView = savedViews.find((v) => v.isDefault);
  const [query, setQuery] = useState(defaultView?.config.filters?.query ?? "");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    defaultView?.config.columns?.length
      ? defaultView.config.columns
      : ALL_COLUMN_KEYS,
  );
  const [sortBy, setSortBy] = useState<string | null>(
    defaultView?.config.sortBy ?? null,
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    defaultView?.config.sortDir ?? "asc",
  );

  function applyView(config: SavedViewConfig): void {
    setVisibleColumns(
      config.columns?.length ? config.columns : ALL_COLUMN_KEYS,
    );
    setSortBy(config.sortBy ?? null);
    setSortDir(config.sortDir ?? "asc");
    setQuery(config.filters?.query ?? "");
  }

  function toggleSort(key: string): void {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  const columns: ClientColumn[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        sortValue: (c) => c.displayName.toLowerCase(),
        cell: (c) => (
          <Link
            href={`/m/clients/${c.id}`}
            className="font-medium text-indigo-600 hover:underline"
          >
            {c.displayName}
          </Link>
        ),
      },
      {
        key: "type",
        label: "Type",
        sortValue: (c) => c.type,
        cell: (c) => <span className="capitalize text-gray-500">{c.type}</span>,
      },
      {
        key: "contact",
        label: "Contact",
        sortValue: (c) => (c.email ?? c.phone ?? "").toLowerCase(),
        cell: (c) => (
          <span className="text-gray-500">{c.email ?? c.phone ?? "—"}</span>
        ),
      },
      {
        key: "location",
        label: "Location",
        sortValue: (c) => (c.location ?? "").toLowerCase(),
        cell: (c) => (
          <span className="text-gray-500">{c.location ?? "—"}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (c) => c.status,
        cell: (c) => {
          const option = statusOptions.find((o) => o.value === c.status);
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(
                option?.color ?? "gray",
              )}`}
            >
              {option?.label ?? c.status}
            </span>
          );
        },
      },
    ],
    [statusOptions],
  );

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startCreate(): void {
    setForm({ ...EMPTY });
    setCustom({});
    setType("person");
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(c: ClientDTO): void {
    setType(c.type);
    setForm({
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      businessName: c.businessName ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      status: c.status,
    });
    setCustom({ ...c.customValues });
    setEditingId(c.id);
    setShowForm(true);
  }

  function close(): void {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY });
    setCustom({});
    setType("person");
  }

  function submit(): void {
    startTransition(async () => {
      const payload = {
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
      };
      if (editingId) {
        await editClient({ id: editingId, ...payload });
      } else {
        await addClient(payload);
      }
      close();
    });
  }

  function remove(c: ClientDTO): void {
    if (
      !confirm(
        `Delete ${c.displayName}? This also deletes the client's policies, ` +
          `claims, and related records. This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      await removeClient(c.id);
    });
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? clients.filter((c) =>
        [c.displayName, c.email ?? "", c.phone ?? "", c.location ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : clients;

  const sortColumn = columns.find((c) => c.key === sortBy);
  const visible = sortColumn
    ? [...filtered].sort((a, b) => {
        const av = sortColumn.sortValue(a);
        const bv = sortColumn.sortValue(b);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const shownColumns = columns.filter((c) => visibleColumns.includes(c.key));

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";

  return (
    <div className="mt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <SavedViewBar
            listKey="clients"
            columns={columns.map((c) => ({ key: c.key, label: c.label }))}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            query={query}
            onQueryChange={setQuery}
            sortBy={sortBy}
            sortDir={sortDir}
            savedViews={savedViews}
            onApplyView={applyView}
            searchPlaceholder="Search clients…"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <ExportCsvButton
            disabled={visible.length === 0}
            onExport={() => exportRowsToCsv("clients", CSV_COLUMNS, visible)}
          />
          {!showForm ? (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              + New client
            </button>
          ) : null}
        </div>
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            {editingId ? "Edit client" : "New client"}
          </p>
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
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
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
                              [f.fieldKey]: e.target.checked
                                ? "true"
                                : "false",
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
              {pending
                ? "Saving…"
                : editingId
                  ? "Update client"
                  : "Save client"}
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
              ? "No clients yet. Add your first one above."
              : "No clients match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {shownColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-gray-700"
                  >
                    {col.label}
                    {sortBy === col.key
                      ? sortDir === "asc"
                        ? " ▲"
                        : " ▼"
                      : ""}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((c) => (
                <tr key={c.id}>
                  {shownColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.cell(c)}
                    </td>
                  ))}
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
