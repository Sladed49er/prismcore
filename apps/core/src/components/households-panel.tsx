"use client";

import { useState, useTransition } from "react";
import {
  newHousehold,
  editHousehold,
  updateHouseholdStatus,
  removeHousehold,
  type HouseholdForm,
} from "@/app/(shell)/m/households/actions";

export interface HouseholdDTO {
  id: string;
  name: string;
  primaryContactName: string;
  advisorName: string;
  type: "family" | "individual" | "trust" | "business";
  aumCents: number;
  riskProfile: "conservative" | "moderate" | "aggressive";
  status: "prospect" | "active" | "inactive";
  notes: string;
}

const TYPES = ["family", "individual", "trust", "business"] as const;
const RISK = ["conservative", "moderate", "aggressive"] as const;
const STATUSES = ["prospect", "active", "inactive"] as const;

const STATUS_COLOR: Record<HouseholdDTO["status"], string> = {
  prospect: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
};

function money(cents: number): string {
  return "$" + Math.round(cents / 100).toLocaleString();
}

const EMPTY: HouseholdForm = {
  name: "",
  primaryContactName: "",
  advisorName: "",
  type: "family",
  aumDollars: "",
  riskProfile: "moderate",
  status: "prospect",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function HouseholdsPanel({
  households,
}: {
  households: HouseholdDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HouseholdForm>({ ...EMPTY });

  function set<K extends keyof HouseholdForm>(
    key: K,
    value: HouseholdForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(h: HouseholdDTO): void {
    setEditId(h.id);
    setForm({
      name: h.name,
      primaryContactName: h.primaryContactName,
      advisorName: h.advisorName,
      type: h.type,
      aumDollars: h.aumCents ? String(h.aumCents / 100) : "",
      riskProfile: h.riskProfile,
      status: h.status,
      notes: h.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editHousehold({ id: editId, ...form });
      else await newHousehold(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: HouseholdDTO["status"]): void {
    startTransition(async () => {
      await updateHouseholdStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this household?")) return;
    startTransition(async () => {
      await removeHousehold(id);
    });
  }

  const totalAum = households
    .filter((h) => h.status === "active")
    .reduce((s, h) => s + h.aumCents, 0);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {households.length} household{households.length === 1 ? "" : "s"} ·{" "}
          {money(totalAum)} AUM (active)
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New household
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Household name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. The Cheng Family"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Primary contact
              <input
                value={form.primaryContactName}
                onChange={(e) => set("primaryContactName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Advisor
              <input
                value={form.advisorName}
                onChange={(e) => set("advisorName", e.target.value)}
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
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Assets under management ($)
              <input
                type="number"
                value={form.aumDollars}
                onChange={(e) => set("aumDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Risk profile
              <select
                value={form.riskProfile}
                onChange={(e) => set("riskProfile", e.target.value)}
                className={inputClass}
              >
                {RISK.map((r) => (
                  <option key={r} value={r}>
                    {r}
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
              {pending ? "Saving…" : editId ? "Save changes" : "Save household"}
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
        {households.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No households yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Household</th>
                <th className="px-4 py-3 font-semibold">Advisor</th>
                <th className="px-4 py-3 font-semibold">Risk</th>
                <th className="px-4 py-3 font-semibold">AUM</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {households.map((h) => (
                <tr key={h.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{h.name}</span>
                    <span className="block text-xs text-gray-500">
                      {[h.type, h.primaryContactName].filter(Boolean).join(" · ")}
                    </span>
                    {h.notes ? (
                      <span className="block text-xs text-gray-400">
                        {h.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {h.advisorName || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{h.riskProfile}</td>
                  <td className="px-4 py-3 font-medium">
                    {money(h.aumCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={h.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          h.id,
                          e.target.value as HouseholdDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[h.status]}`}
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
                        onClick={() => openEdit(h)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(h.id)}
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
