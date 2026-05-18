"use client";

import { useState, useTransition } from "react";
import {
  newMemberBenefit,
  editMemberBenefit,
  toggleMemberBenefitActive,
  removeMemberBenefit,
  type MemberBenefitForm,
} from "@/app/(shell)/m/member_benefits/actions";

export interface MemberBenefitDTO {
  id: string;
  name: string;
  partnerName: string;
  category:
    | "discount"
    | "service"
    | "resource"
    | "insurance"
    | "education"
    | "other";
  description: string;
  redemptionDetails: string;
  url: string;
  isActive: boolean;
  notes: string;
}

const CATEGORIES = [
  "discount",
  "service",
  "resource",
  "insurance",
  "education",
  "other",
] as const;

const CATEGORY_COLOR: Record<MemberBenefitDTO["category"], string> = {
  discount: "bg-emerald-50 text-emerald-700",
  service: "bg-blue-50 text-blue-700",
  resource: "bg-indigo-50 text-indigo-700",
  insurance: "bg-violet-50 text-violet-700",
  education: "bg-amber-50 text-amber-700",
  other: "bg-gray-100 text-gray-600",
};

const EMPTY: MemberBenefitForm = {
  name: "",
  partnerName: "",
  category: "discount",
  description: "",
  redemptionDetails: "",
  url: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function MemberBenefitsPanel({
  benefits,
}: {
  benefits: MemberBenefitDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberBenefitForm>({ ...EMPTY });

  function set<K extends keyof MemberBenefitForm>(
    key: K,
    value: MemberBenefitForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(b: MemberBenefitDTO): void {
    setEditId(b.id);
    setForm({
      name: b.name,
      partnerName: b.partnerName,
      category: b.category,
      description: b.description,
      redemptionDetails: b.redemptionDetails,
      url: b.url,
      notes: b.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editMemberBenefit({ id: editId, ...form });
      else await newMemberBenefit(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this benefit?")) return;
    startTransition(async () => {
      await removeMemberBenefit(id);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {benefits.length} benefit{benefits.length === 1 ? "" : "s"} ·{" "}
          {benefits.filter((b) => b.isActive).length} active
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New benefit
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Benefit name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Partner
              <input
                value={form.partnerName}
                onChange={(e) => set("partnerName", e.target.value)}
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
              Link
              <input
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              How to redeem
              <input
                value={form.redemptionDetails}
                onChange={(e) => set("redemptionDetails", e.target.value)}
                placeholder="Promo code, instructions, contact"
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
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save benefit"}
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {benefits.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500 sm:col-span-2">
            No member benefits yet.
          </p>
        ) : (
          benefits.map((b) => (
            <div
              key={b.id}
              className={`rounded-xl border bg-white p-5 ${
                b.isActive ? "border-gray-200" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{b.name}</p>
                  {b.partnerName ? (
                    <p className="text-xs text-gray-500">{b.partnerName}</p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLOR[b.category]}`}
                >
                  {b.category}
                </span>
              </div>
              {b.description ? (
                <p className="mt-2 text-sm text-gray-600">{b.description}</p>
              ) : null}
              {b.redemptionDetails ? (
                <p className="mt-1 text-xs text-gray-500">
                  Redeem: {b.redemptionDetails}
                </p>
              ) : null}
              {b.url ? (
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-xs text-indigo-600 hover:underline"
                >
                  {b.url}
                </a>
              ) : null}
              <div className="mt-3 flex gap-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await toggleMemberBenefitActive({
                        id: b.id,
                        isActive: !b.isActive,
                      });
                    })
                  }
                  disabled={pending}
                  className="text-gray-500 hover:text-gray-800"
                >
                  {b.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(b)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  disabled={pending}
                  className="text-rose-600 hover:text-rose-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
