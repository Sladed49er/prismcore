"use client";

import { useState, useTransition } from "react";
import {
  connectAms,
  disconnectAms,
  testAms,
  type AmsFormInput,
} from "@/app/(shell)/m/telephony/actions";

export interface AmsProviderDTO {
  id: string;
  name: string;
  description: string;
}

export interface AmsConnectionDTO {
  connected: boolean;
  provider: string;
  endpoint: string;
  username: string;
  employeeCode: string;
  webTenantId: string;
  autoSyncCalls: boolean;
  screenPopEnabled: boolean;
  /** True when a password is already stored — the form never receives it. */
  hasPassword: boolean;
}

/**
 * Per-provider field labelling. Every AMS stores the same four credential
 * slots (endpoint / username / password / employeeCode) plus webTenantId, but
 * each system means something different by them — so the form relabels itself
 * to the selected provider rather than asking for "WSAPI login id" of EZLynx.
 */
interface ProviderFields {
  endpointLabel: string;
  endpointPlaceholder: string;
  usernameLabel: string;
  passwordLabel: string;
  showEmployeeCode: boolean;
  employeeCodeLabel: string;
  showWebTenantId: boolean;
  hint: string;
}

const PROVIDER_FIELDS: Record<string, ProviderFields> = {
  ams360: {
    endpointLabel: "Agency number (AgencyNo)",
    endpointPlaceholder: "AMS360 AgencyNo",
    usernameLabel: "WSAPI login ID",
    passwordLabel: "WSAPI password",
    showEmployeeCode: true,
    employeeCodeLabel: "Employee code (optional)",
    showWebTenantId: true,
    hint: "Vertafore AMS360 WSAPI v3 credentials. Real-time caller lookup and activity notes.",
  },
  hawksoft: {
    endpointLabel: "HawkSoft Agency ID",
    endpointPlaceholder: "Agency ID",
    usernameLabel: "API username",
    passwordLabel: "API password",
    showEmployeeCode: false,
    employeeCodeLabel: "",
    showWebTenantId: false,
    hint: "HawkSoft Partner API credentials — enable the integration in the HawkSoft Marketplace. Caller matching uses a client index that refreshes daily.",
  },
  applied_epic: {
    endpointLabel: "API base URL",
    endpointPlaceholder: "https://api.myappliedproducts.com",
    usernameLabel: "OAuth client ID",
    passwordLabel: "OAuth client secret",
    showEmployeeCode: true,
    employeeCodeLabel: "Owner / employee ID (optional)",
    showWebTenantId: false,
    hint: "Applied Epic API Suite — OAuth2 client-credentials from the Applied Developer Portal. Real-time lookup and activity notes.",
  },
  ezlynx: {
    endpointLabel: "API base URL (optional)",
    endpointPlaceholder: "defaults to EZLynx production",
    usernameLabel: "EZUser",
    passwordLabel: "EZPassword",
    showEmployeeCode: true,
    employeeCodeLabel: "EZAppSecret",
    showWebTenantId: false,
    hint: "EZLynx API credentials. Screen-pop matching uses a synced applicant index; EZLynx has no activity-note API, so call notes stay in Prism Core.",
  },
};

/**
 * Connect the tenant's agency-management system — the AMS that PrismVoice
 * looks callers up in (screen pop) and writes call notes back into.
 */
export function AmsConnectionCard({
  providers,
  connection,
}: {
  providers: AmsProviderDTO[];
  connection: AmsConnectionDTO;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<AmsFormInput>({
    provider: connection.provider,
    endpoint: connection.endpoint,
    username: connection.username,
    password: "",
    employeeCode: connection.employeeCode,
    webTenantId: connection.webTenantId,
    autoSyncCalls: connection.autoSyncCalls,
    screenPopEnabled: connection.screenPopEnabled,
  });
  const [result, setResult] = useState<
    { success: boolean; message: string } | null
  >(null);

  function set<K extends keyof AmsFormInput>(
    key: K,
    value: AmsFormInput[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
    setResult(null);
  }

  function save(): void {
    startTransition(async () => {
      await connectAms(form);
      setForm((f) => ({ ...f, password: "" }));
      setResult({ success: true, message: "AMS connection saved." });
    });
  }

  function test(): void {
    startTransition(async () => {
      setResult(await testAms(form));
    });
  }

  function disconnect(): void {
    if (!confirm("Disconnect this AMS? Screen pop and call sync will stop."))
      return;
    startTransition(async () => {
      await disconnectAms();
      setForm((f) => ({ ...f, password: "", endpoint: "", username: "" }));
      setResult(null);
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  const fields = PROVIDER_FIELDS[form.provider] ?? PROVIDER_FIELDS.ams360!;
  const providerName =
    providers.find((p) => p.id === form.provider)?.name ??
    form.provider;

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Agency-management system
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Connect your AMS so inbound calls screen-pop the matching client record
        and call notes sync back automatically.
      </p>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        {connection.connected ? (
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            {providerName} connected
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>
            AMS provider
            <select
              value={form.provider}
              onChange={(e) => set("provider", e.target.value)}
              className={inputClass}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <p className="-mt-1 text-xs text-gray-500 sm:col-span-2">
            {fields.hint}
          </p>

          <label className={labelClass}>
            {fields.endpointLabel}
            <input
              value={form.endpoint}
              onChange={(e) => set("endpoint", e.target.value)}
              className={inputClass}
              placeholder={fields.endpointPlaceholder}
            />
          </label>
          {fields.showWebTenantId ? (
            <label className={labelClass}>
              Web portal tenant id
              <input
                value={form.webTenantId}
                onChange={(e) => set("webTenantId", e.target.value)}
                className={inputClass}
                placeholder="for the screen-pop URL (defaults to AgencyNo)"
              />
            </label>
          ) : null}
          <label className={labelClass}>
            {fields.usernameLabel}
            <input
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            {fields.passwordLabel}
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className={inputClass}
              placeholder={
                connection.hasPassword ? "•••••• (leave blank to keep)" : ""
              }
            />
          </label>
          {fields.showEmployeeCode ? (
            <label className={labelClass}>
              {fields.employeeCodeLabel}
              <input
                value={form.employeeCode}
                onChange={(e) => set("employeeCode", e.target.value)}
                className={inputClass}
              />
            </label>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.screenPopEnabled}
              onChange={(e) => set("screenPopEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Screen-pop the matched client to the agent on call connect
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.autoSyncCalls}
              onChange={(e) => set("autoSyncCalls", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Sync a call activity note back to the AMS contact when a call ends
          </label>
          {form.provider === "ezlynx" ? (
            <p className="pl-6 text-xs text-gray-400">
              EZLynx has no activity-note API — call notes are kept in Prism
              Core regardless of this setting.
            </p>
          ) : null}
        </div>

        {result ? (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              result.success
                ? "bg-green-50 text-green-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {result.message}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {pending
              ? "Saving…"
              : connection.connected
                ? "Save connection"
                : "Connect AMS"}
          </button>
          <button
            type="button"
            onClick={test}
            disabled={pending}
            className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
          >
            Test connection
          </button>
          {connection.connected ? (
            <button
              type="button"
              onClick={disconnect}
              disabled={pending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-40"
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
