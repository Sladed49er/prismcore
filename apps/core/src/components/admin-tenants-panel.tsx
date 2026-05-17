"use client";

import { useState, useTransition } from "react";
import {
  newTenant,
  openWorkspace,
  type TenantPreset,
} from "@/app/admin/tenants/actions";

export interface AdminTenantDTO {
  id: string;
  name: string;
  slug: string;
  status: string;
  tier: string;
  moduleCount: number;
}

const STATUS_COLOR: Record<string, string> = {
  trial: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-rose-50 text-rose-700",
  archived: "bg-gray-100 text-gray-500",
};

export function AdminTenantsPanel({
  tenants,
}: {
  tenants: AdminTenantDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<TenantPreset>("full");

  function submit(): void {
    startTransition(async () => {
      await newTenant({ name, preset });
      setName("");
      setPreset("full");
      setShowForm(false);
    });
  }

  function open(id: string): void {
    startTransition(async () => {
      await openWorkspace(id);
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
          {tenants.length} tenant{tenants.length === 1 ? "" : "s"} on the
          platform
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New tenant
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            Provision a tenant
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Tenant name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Harbor Insurance Group"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Starting modules
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as TenantPreset)}
                className={inputClass}
              >
                <option value="full">Full suite</option>
                <option value="telephony">Telephony only</option>
                <option value="empty">Empty — compose later</option>
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            The tenant is created active and fully isolated. Tune its modules
            anytime in Module Management.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Creating…" : "Create tenant"}
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
        {tenants.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No tenants yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Tenant</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Modules</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {t.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.tier}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[t.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.moduleCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => open(t.id)}
                      className="rounded-lg border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
                    >
                      Open workspace →
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
