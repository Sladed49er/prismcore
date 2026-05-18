"use client";

import { useState, useTransition } from "react";
import {
  newMembership,
  editMembership,
  updateMembershipStatus,
  removeMembership,
  type MembershipForm,
} from "@/app/(shell)/m/memberships/actions";

export interface MembershipDTO {
  id: string;
  memberName: string;
  organization: string;
  tier: "individual" | "professional" | "corporate" | "student" | "lifetime";
  status: "active" | "pending" | "lapsed" | "cancelled";
  joinDate: string | null;
  renewalDate: string | null;
  duesCents: number;
  email: string;
  phone: string;
  notes: string;
}

const TIERS = [
  "individual",
  "professional",
  "corporate",
  "student",
  "lifetime",
] as const;
const STATUSES = ["active", "pending", "lapsed", "cancelled"] as const;

const STATUS_COLOR: Record<MembershipDTO["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  lapsed: "bg-rose-50 text-rose-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY: MembershipForm = {
  memberName: "",
  organization: "",
  tier: "individual",
  status: "pending",
  joinDate: "",
  renewalDate: "",
  duesDollars: "",
  email: "",
  phone: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function MembershipsPanel({
  members,
}: {
  members: MembershipDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MembershipForm>({ ...EMPTY });

  function set<K extends keyof MembershipForm>(
    key: K,
    value: MembershipForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(m: MembershipDTO): void {
    setEditId(m.id);
    setForm({
      memberName: m.memberName,
      organization: m.organization,
      tier: m.tier,
      status: m.status,
      joinDate: m.joinDate ?? "",
      renewalDate: m.renewalDate ?? "",
      duesDollars: m.duesCents ? String(m.duesCents / 100) : "",
      email: m.email,
      phone: m.phone,
      notes: m.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editMembership({ id: editId, ...form });
      else await newMembership(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: MembershipDTO["status"]): void {
    startTransition(async () => {
      await updateMembershipStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this membership?")) return;
    startTransition(async () => {
      await removeMembership(id);
    });
  }

  const active = members.filter((m) => m.status === "active").length;
  const dues = members
    .filter((m) => m.status === "active")
    .reduce((s, m) => s + m.duesCents, 0);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {members.length} member{members.length === 1 ? "" : "s"} · {active}{" "}
          active · {money(dues)} dues
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New member
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Member name
              <input
                value={form.memberName}
                onChange={(e) => set("memberName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Organization
              <input
                value={form.organization}
                onChange={(e) => set("organization", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Tier
              <select
                value={form.tier}
                onChange={(e) => set("tier", e.target.value)}
                className={inputClass}
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
              Join date
              <input
                type="date"
                value={form.joinDate}
                onChange={(e) => set("joinDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Renewal date
              <input
                type="date"
                value={form.renewalDate}
                onChange={(e) => set("renewalDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Annual dues ($)
              <input
                type="number"
                value={form.duesDollars}
                onChange={(e) => set("duesDollars", e.target.value)}
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
              disabled={pending || !form.memberName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save member"}
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
        {members.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No members yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Renewal</th>
                <th className="px-4 py-3 font-semibold">Dues</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{m.memberName}</span>
                    <span className="block text-xs text-gray-500">
                      {[m.organization, m.email].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.tier}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {m.renewalDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(m.duesCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={m.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          m.id,
                          e.target.value as MembershipDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[m.status]}`}
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
                        onClick={() => openEdit(m)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(m.id)}
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
