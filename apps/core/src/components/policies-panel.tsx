"use client";

import { useState, useTransition } from "react";
import { addPolicy } from "@/app/(shell)/m/policies/register/actions";

export interface PolicyDTO {
  id: string;
  policyNumber: string;
  clientName: string;
  lineOfBusiness: string;
  carrier: string;
  status: string;
  expirationDate: string | null;
  premiumCents: number;
}

export interface ClientOption {
  id: string;
  name: string;
}

export interface CustomFieldDTO {
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
}

const LINES = [
  "General Liability", "Commercial Auto", "Commercial Property", "Workers Comp",
  "Business Owners Policy", "Builders Risk", "Homeowners", "Personal Auto",
  "Umbrella", "Professional Liability", "Cyber", "Other",
];

const STATUS_STYLE: Record<string, string> = {
  quoted: "bg-amber-50 text-amber-700",
  active: "bg-green-50 text-green-700",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-50 text-red-700",
};

const EMPTY = {
  policyNumber: "",
  lineOfBusiness: "General Liability",
  carrier: "",
  status: "quoted",
  effectiveDate: "",
  expirationDate: "",
  premiumDollars: "",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

export function PoliciesPanel({
  policies,
  clients,
  customFields,
}: {
  policies: PolicyDTO[];
  clients: ClientOption[];
  customFields: CustomFieldDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState({ ...EMPTY });
  const [custom, setCustom] = useState<Record<string, string>>({});

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addPolicy({
        clientId,
        policyNumber: form.policyNumber,
        lineOfBusiness: form.lineOfBusiness,
        carrier: form.carrier,
        status: form.status as "quoted" | "active" | "expired" | "cancelled",
        effectiveDate: form.effectiveDate,
        expirationDate: form.expirationDate,
        premiumDollars: form.premiumDollars,
        customValues: custom,
      });
      setForm({ ...EMPTY });
      setClientId("");
      setCustom({});
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
          {policies.length} polic{policies.length === 1 ? "y" : "ies"}
        </p>
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New policy
          </button>
        ) : null}
      </div>

      {clients.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a client first — every policy is written on a client.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Insured (client)
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Policy number
              <input
                value={form.policyNumber}
                onChange={(e) => set("policyNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Line of business
              <select
                value={form.lineOfBusiness}
                onChange={(e) => set("lineOfBusiness", e.target.value)}
                className={inputClass}
              >
                {LINES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Carrier
              <input
                value={form.carrier}
                onChange={(e) => set("carrier", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                <option value="quoted">quoted</option>
                <option value="active">active</option>
                <option value="expired">expired</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            <label className={labelClass}>
              Effective date
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => set("effectiveDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Expiration date
              <input
                type="date"
                value={form.expirationDate}
                onChange={(e) => set("expirationDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Annual premium ($)
              <input
                type="number"
                value={form.premiumDollars}
                onChange={(e) => set("premiumDollars", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {customFields.length > 0 ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Your custom fields
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {customFields.map((f) => (
                  <label key={f.fieldKey} className={labelClass}>
                    {f.label}
                    {f.required ? " *" : ""}
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
                        setCustom((c) => ({ ...c, [f.fieldKey]: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !clientId || !form.policyNumber.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save policy"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm({ ...EMPTY });
                setClientId("");
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
        {policies.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No policies yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy #</th>
                <th className="px-4 py-3 font-semibold">Insured</th>
                <th className="px-4 py-3 font-semibold">Line</th>
                <th className="px-4 py-3 font-semibold">Carrier</th>
                <th className="px-4 py-3 font-semibold">Premium</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {policies.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{p.clientName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.lineOfBusiness}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.carrier || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(p.premiumCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {p.status}
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
