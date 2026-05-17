"use client";

import { useState, useTransition } from "react";
import {
  connectProvider,
  disconnectProvider,
  simulateCall,
} from "@/app/(shell)/m/telephony/actions";
import { ModuleIcon } from "@/components/module-icon";

export interface VoipProviderDTO {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface VoipCredentials {
  accountId: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
}

export interface ConnectionDTO {
  providerId: string;
  credentials: VoipCredentials;
}

export interface CallDTO {
  id: string;
  direction: "inbound" | "outbound";
  fromNumber: string;
  contactName: string | null;
  durationSeconds: number;
  aiSummary: string | null;
  disposition: string | null;
  occurredAt: string;
  /** AMS write-back state — not_synced | pending | synced | skipped | failed. */
  amsSyncStatus: string;
}

/** AMS write-back badge for a call, or undefined when there's nothing to show. */
const AMS_SYNC_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "AMS sync pending", className: "bg-amber-50 text-amber-700" },
  synced: { label: "Synced to AMS", className: "bg-green-50 text-green-700" },
  failed: { label: "AMS sync failed", className: "bg-rose-50 text-rose-700" },
};

const EMPTY_CREDS: VoipCredentials = {
  accountId: "",
  apiKey: "",
  apiSecret: "",
  webhookSecret: "",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PrismVoicePanel({
  providers,
  connections,
  calls,
}: {
  providers: VoipProviderDTO[];
  connections: ConnectionDTO[];
  calls: CallDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<VoipCredentials>({ ...EMPTY_CREDS });

  const byProvider = new Map(connections.map((c) => [c.providerId, c]));

  function set(key: keyof VoipCredentials, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startConfigure(providerId: string): void {
    const existing = byProvider.get(providerId);
    setForm(existing ? { ...existing.credentials } : { ...EMPTY_CREDS });
    setEditing(providerId);
  }

  function save(providerId: string): void {
    startTransition(async () => {
      await connectProvider(providerId, form);
      setEditing(null);
      setForm({ ...EMPTY_CREDS });
    });
  }

  function disconnect(providerId: string): void {
    if (
      !confirm("Disconnect this phone system? Its credentials are removed.")
    )
      return;
    startTransition(async () => {
      await disconnectProvider(providerId);
      setEditing(null);
    });
  }

  function simulate(): void {
    startTransition(async () => {
      await simulateCall();
    });
  }

  const editingProvider = providers.find((p) => p.id === editing);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-8 space-y-10">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Phone system
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Connect your VoIP provider and plug in its credentials. Inbound calls
          then screen-pop and log themselves automatically.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => {
            const isConnected = byProvider.has(p.id);
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 ${
                  isConnected
                    ? "border-indigo-500 bg-indigo-50/40"
                    : "border-gray-200"
                }`}
              >
                <ModuleIcon
                  name={p.icon}
                  className={`h-5 w-5 ${isConnected ? "text-indigo-600" : "text-gray-400"}`}
                />
                <h3 className="mt-2 font-semibold">{p.name}</h3>
                <p className="mt-0.5 text-sm text-gray-600">
                  {p.description}
                </p>
                {isConnected ? (
                  <>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startConfigure(p.id)}
                        disabled={pending}
                        className="flex-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
                      >
                        Credentials
                      </button>
                      <button
                        type="button"
                        onClick={() => disconnect(p.id)}
                        disabled={pending}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    </div>
                    <p className="mt-2 text-xs font-medium text-indigo-600">
                      ● Connected
                    </p>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => startConfigure(p.id)}
                    disabled={pending}
                    className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {editingProvider ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-gray-700">
              {editingProvider.name} credentials
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Stored against this tenant only, RLS-isolated. Used to
              authenticate the screen-pop webhook and provider API calls.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Account ID
                <input
                  value={form.accountId}
                  onChange={(e) => set("accountId", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                API key / client ID
                <input
                  value={form.apiKey}
                  onChange={(e) => set("apiKey", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                API secret / token
                <input
                  type="password"
                  value={form.apiSecret}
                  onChange={(e) => set("apiSecret", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Webhook signing secret
                <input
                  type="password"
                  value={form.webhookSecret}
                  onChange={(e) => set("webhookSecret", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => save(editingProvider.id)}
                disabled={pending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
              >
                {pending
                  ? "Saving…"
                  : byProvider.has(editingProvider.id)
                    ? "Save credentials"
                    : "Connect provider"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Recent calls
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Every call screen-popped to the caller and summarized by AI.
            </p>
          </div>
          <button
            type="button"
            onClick={simulate}
            disabled={pending}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "…" : "Simulate inbound call"}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {calls.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
              No calls yet. Click &ldquo;Simulate inbound call&rdquo; to see the
              screen pop.
            </p>
          ) : (
            calls.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.contactName
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.contactName ? "Matched" : "Unknown caller"}
                    </span>
                    <span className="font-semibold">
                      {c.contactName ?? c.fromNumber}
                    </span>
                    {c.contactName ? (
                      <span className="text-sm text-gray-400">
                        {c.fromNumber}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-gray-400">
                    {c.direction} · {formatDuration(c.durationSeconds)} ·{" "}
                    {formatTime(c.occurredAt)}
                  </span>
                </div>
                {c.aiSummary ? (
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-indigo-600">
                      AI summary:
                    </span>{" "}
                    {c.aiSummary}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {c.disposition ? (
                    <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {c.disposition}
                    </span>
                  ) : null}
                  {AMS_SYNC_BADGE[c.amsSyncStatus] ? (
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${AMS_SYNC_BADGE[c.amsSyncStatus]!.className}`}
                    >
                      {AMS_SYNC_BADGE[c.amsSyncStatus]!.label}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
