"use client";

import { useState, useTransition } from "react";
import { saveBillingOverride } from "@/app/admin/billing/actions";

export interface AdminBillingDTO {
  tenantId: string;
  tenantName: string;
  status: string;
  customPriceCents: number | null;
  comp: boolean;
  billingNotes: string;
}

const STATUS_COLOR: Record<string, string> = {
  none: "bg-gray-100 text-gray-600",
  trialing: "bg-blue-50 text-blue-700",
  active: "bg-emerald-50 text-emerald-700",
  past_due: "bg-amber-50 text-amber-700",
  canceled: "bg-gray-100 text-gray-500",
  suspended: "bg-rose-50 text-rose-700",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

/**
 * Admin billing panel — per-tenant billing customization. A platform admin
 * sets a negotiated custom monthly price, marks an account complimentary, or
 * records special-conditions notes for any tenant.
 */
export function AdminBillingPanel({
  billing,
}: {
  billing: AdminBillingDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customPriceDollars: "",
    comp: false,
    billingNotes: "",
  });

  function openEdit(b: AdminBillingDTO): void {
    setEditId(b.tenantId);
    setForm({
      customPriceDollars:
        b.customPriceCents != null ? String(b.customPriceCents / 100) : "",
      comp: b.comp,
      billingNotes: b.billingNotes,
    });
  }

  function save(tenantId: string): void {
    startTransition(async () => {
      await saveBillingOverride({ tenantId, ...form });
      setEditId(null);
    });
  }

  return (
    <div className="mt-6 space-y-3">
      {billing.map((b) => (
        <div
          key={b.tenantId}
          className="rounded-xl border border-gray-200 bg-white p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {b.tenantName}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    STATUS_COLOR[b.status] ?? STATUS_COLOR.none
                  }`}
                >
                  {b.status}
                </span>
                {b.comp ? (
                  <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    Complimentary
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {b.customPriceCents != null
                  ? `Custom rate: ${money(b.customPriceCents)}/mo`
                  : "Standard pricing"}
              </p>
              {b.billingNotes ? (
                <p className="mt-1 text-xs text-gray-400">
                  {b.billingNotes}
                </p>
              ) : null}
            </div>
            {editId !== b.tenantId ? (
              <button
                type="button"
                onClick={() => openEdit(b)}
                className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Customize
              </button>
            ) : null}
          </div>

          {editId === b.tenantId ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Custom monthly price ($)
                  <input
                    type="number"
                    value={form.customPriceDollars}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        customPriceDollars: e.target.value,
                      }))
                    }
                    placeholder="blank = standard plan price"
                    className={inputClass}
                  />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  Special-conditions notes
                  <input
                    value={form.billingNotes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        billingNotes: e.target.value,
                      }))
                    }
                    placeholder="e.g. annual prepay, net-30, partner rate"
                    className={inputClass}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.comp}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, comp: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Complimentary account — never charged or dunned
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => save(b.tenantId)}
                  disabled={pending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
