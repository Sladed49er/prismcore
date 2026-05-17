"use client";

import { useState, useTransition } from "react";
import {
  toggleModule,
  addModule,
} from "@/app/admin/modules/actions";

export interface TenantModuleRowDTO {
  id: string;
  tenantId: string;
  tenantName: string;
  moduleId: string;
  enabled: boolean;
}

export interface AdminTenantOption {
  id: string;
  name: string;
}

export interface ModuleOption {
  id: string;
  name: string;
}

export function AdminModulesPanel({
  rows,
  tenants,
  modules,
}: {
  rows: TenantModuleRowDTO[];
  tenants: AdminTenantOption[];
  modules: ModuleOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenantId: "", moduleId: "" });

  const moduleName = new Map(modules.map((m) => [m.id, m.name]));

  function submit(): void {
    startTransition(async () => {
      await addModule(form);
      setForm({ tenantId: "", moduleId: "" });
      setShowForm(false);
    });
  }

  function toggle(id: string, enabled: boolean): void {
    startTransition(async () => {
      await toggleModule({ id, enabled: !enabled });
    });
  }

  const enabled = rows.filter((r) => r.enabled).length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rows.length} module assignment{rows.length === 1 ? "" : "s"} ·{" "}
          {enabled} enabled across {tenants.length} tenant
          {tenants.length === 1 ? "" : "s"}
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Enable a module
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Tenant
              <select
                value={form.tenantId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tenantId: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Select a tenant…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Module
              <select
                value={form.moduleId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, moduleId: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Select a module…</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.tenantId || !form.moduleId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Enable module"}
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
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No module assignments yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Tenant</th>
                <th className="px-4 py-3 font-semibold">Module</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.tenantName}</td>
                  <td className="px-4 py-3">
                    <span>{moduleName.get(r.moduleId) ?? r.moduleId}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {r.moduleId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.enabled
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {r.enabled ? "enabled" : "disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(r.id, r.enabled)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      {r.enabled ? "Disable" : "Enable"}
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
