"use client";

import { useState, useTransition } from "react";
import {
  newUnderwritingGuideline,
  updateGuidelineStatus,
} from "@/app/(shell)/m/carriers/guidelines/actions";

export interface CarrierOption {
  id: string;
  label: string;
}

export interface UnderwritingGuidelineDTO {
  id: string;
  carrierName: string;
  lineOfBusiness: string;
  title: string;
  guidelines: string;
  status: "current" | "under_review" | "retired";
}

const STATUS_COLOR: Record<UnderwritingGuidelineDTO["status"], string> = {
  current: "bg-emerald-50 text-emerald-700",
  under_review: "bg-amber-50 text-amber-700",
  retired: "bg-gray-100 text-gray-500",
};

const EMPTY = {
  carrierId: "",
  lineOfBusiness: "",
  title: "",
  guidelines: "",
};

export function UnderwritingGuidelinesPanel({
  guidelines,
  carriers,
}: {
  guidelines: UnderwritingGuidelineDTO[];
  carriers: CarrierOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newUnderwritingGuideline(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: UnderwritingGuidelineDTO["status"],
  ): void {
    startTransition(async () => {
      await updateGuidelineStatus({ id, status });
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
          {guidelines.length} guideline{guidelines.length === 1 ? "" : "s"}
        </p>
        {!showForm && carriers.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New guideline
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Carrier
              <select
                value={form.carrierId}
                onChange={(e) => set("carrierId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a carrier…</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Line of business
              <input
                value={form.lineOfBusiness}
                onChange={(e) => set("lineOfBusiness", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Guidelines
              <textarea
                value={form.guidelines}
                onChange={(e) => set("guidelines", e.target.value)}
                rows={4}
                placeholder="Appetite, eligibility, restrictions…"
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.carrierId || !form.title.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save guideline"}
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

      <div className="mt-5 space-y-3">
        {guidelines.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
            {carriers.length === 0
              ? "Add a carrier first, then capture its underwriting guidelines."
              : "No underwriting guidelines yet."}
          </p>
        ) : (
          guidelines.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{g.title}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {g.carrierName}
                    {g.lineOfBusiness ? ` · ${g.lineOfBusiness}` : ""}
                  </p>
                </div>
                <select
                  value={g.status}
                  disabled={pending}
                  onChange={(e) =>
                    changeStatus(
                      g.id,
                      e.target.value as UnderwritingGuidelineDTO["status"],
                    )
                  }
                  className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[g.status]}`}
                >
                  <option value="current">current</option>
                  <option value="under_review">under_review</option>
                  <option value="retired">retired</option>
                </select>
              </div>
              {g.guidelines ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                  {g.guidelines}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
