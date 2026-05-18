"use client";

import { useState, useTransition } from "react";
import {
  newContract,
  editContract,
  updateContractStatus,
  removeContract,
  type ContractForm,
} from "@/app/(shell)/m/contracts/actions";

export interface ContractDTO {
  id: string;
  vendorName: string;
  title: string;
  category: "software" | "services" | "lease" | "equipment" | "insurance" | "other";
  status: "active" | "pending" | "expired" | "cancelled";
  startDate: string | null;
  endDate: string | null;
  annualValueCents: number;
  autoRenew: boolean;
  noticePeriodDays: number;
  ownerName: string;
  notes: string;
}

const CATEGORIES = [
  "software",
  "services",
  "lease",
  "equipment",
  "insurance",
  "other",
] as const;
const STATUSES = ["active", "pending", "expired", "cancelled"] as const;

const STATUS_COLOR: Record<ContractDTO["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  expired: "bg-rose-50 text-rose-700",
  cancelled: "bg-gray-100 text-gray-600",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

/** Days until a YYYY-MM-DD date; null if no date. Negative = past. */
function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date + "T00:00:00").getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

const EMPTY: ContractForm = {
  vendorName: "",
  title: "",
  category: "software",
  status: "active",
  startDate: "",
  endDate: "",
  annualValueDollars: "",
  autoRenew: false,
  noticePeriodDays: "",
  ownerName: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function ContractsPanel({ contracts }: { contracts: ContractDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractForm>({ ...EMPTY });

  function set<K extends keyof ContractForm>(
    key: K,
    value: ContractForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(c: ContractDTO): void {
    setEditId(c.id);
    setForm({
      vendorName: c.vendorName,
      title: c.title,
      category: c.category,
      status: c.status,
      startDate: c.startDate ?? "",
      endDate: c.endDate ?? "",
      annualValueDollars: c.annualValueCents
        ? String(c.annualValueCents / 100)
        : "",
      autoRenew: c.autoRenew,
      noticePeriodDays: c.noticePeriodDays ? String(c.noticePeriodDays) : "",
      ownerName: c.ownerName,
      notes: c.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editContract({ id: editId, ...form });
      else await newContract(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: ContractDTO["status"]): void {
    startTransition(async () => {
      await updateContractStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this contract? This cannot be undone.")) return;
    startTransition(async () => {
      await removeContract(id);
    });
  }

  const totalValue = contracts
    .filter((c) => c.status === "active" || c.status === "pending")
    .reduce((s, c) => s + c.annualValueCents, 0);
  const expiringSoon = contracts.filter((c) => {
    const d = daysUntil(c.endDate);
    return (
      (c.status === "active" || c.status === "pending") &&
      d !== null &&
      d >= 0 &&
      d <= 90
    );
  }).length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {contracts.length} contract{contracts.length === 1 ? "" : "s"} ·{" "}
          {money(totalValue)}/yr active
          {expiringSoon > 0 ? (
            <span className="text-amber-700">
              {" "}
              · {expiringSoon} expiring within 90 days
            </span>
          ) : null}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New contract
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Vendor
              <input
                value={form.vendorName}
                onChange={(e) => set("vendorName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contract title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Annual SaaS subscription"
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
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Start date
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Renewal / end date
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Annual value ($)
              <input
                type="number"
                value={form.annualValueDollars}
                onChange={(e) => set("annualValueDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Notice period (days)
              <input
                type="number"
                value={form.noticePeriodDays}
                onChange={(e) => set("noticePeriodDays", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Internal owner
              <input
                value={form.ownerName}
                onChange={(e) => set("ownerName", e.target.value)}
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
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.autoRenew}
                onChange={(e) => set("autoRenew", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Auto-renews
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.vendorName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save contract"}
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
        {contracts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No contracts tracked yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Renewal</th>
                <th className="px-4 py-3 font-semibold">Annual</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((c) => {
                const days = daysUntil(c.endDate);
                const expiring =
                  days !== null &&
                  days >= 0 &&
                  days <= 90 &&
                  (c.status === "active" || c.status === "pending");
                return (
                  <tr key={c.id} className="align-top">
                    <td className="px-4 py-3">
                      <span className="font-medium">{c.vendorName}</span>
                      {c.title ? (
                        <span className="block text-xs text-gray-500">
                          {c.title}
                        </span>
                      ) : null}
                      {c.ownerName ? (
                        <span className="block text-xs text-gray-400">
                          Owner: {c.ownerName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          expiring
                            ? "font-medium text-amber-700"
                            : "text-gray-500"
                        }
                      >
                        {c.endDate ?? "—"}
                      </span>
                      {expiring ? (
                        <span className="block text-xs text-amber-600">
                          in {days} day{days === 1 ? "" : "s"}
                          {c.autoRenew ? " · auto-renews" : ""}
                        </span>
                      ) : c.autoRenew ? (
                        <span className="block text-xs text-gray-400">
                          auto-renews
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {money(c.annualValueCents)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        disabled={pending}
                        onChange={(e) =>
                          changeStatus(
                            c.id,
                            e.target.value as ContractDTO["status"],
                          )
                        }
                        className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[c.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 text-xs font-semibold">
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
