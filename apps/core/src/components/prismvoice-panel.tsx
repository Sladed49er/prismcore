"use client";

import { useTransition } from "react";
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

export interface CallDTO {
  id: string;
  direction: "inbound" | "outbound";
  fromNumber: string;
  contactName: string | null;
  durationSeconds: number;
  aiSummary: string | null;
  disposition: string | null;
  occurredAt: string;
}

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
  connectedIds,
  calls,
}: {
  providers: VoipProviderDTO[];
  connectedIds: string[];
  calls: CallDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const connected = new Set(connectedIds);

  function toggleProvider(id: string, isConnected: boolean): void {
    startTransition(async () => {
      if (isConnected) await disconnectProvider(id);
      else await connectProvider(id);
    });
  }

  function simulate(): void {
    startTransition(async () => {
      await simulateCall();
    });
  }

  return (
    <div className="mt-8 space-y-10">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Phone system
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Connect your VoIP provider once. Inbound calls then screen-pop and log
          themselves automatically.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => {
            const isConnected = connected.has(p.id);
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
                <p className="mt-0.5 text-sm text-gray-600">{p.description}</p>
                <button
                  type="button"
                  onClick={() => toggleProvider(p.id, isConnected)}
                  disabled={pending}
                  className={`mt-3 w-full rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${
                    isConnected
                      ? "border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {isConnected ? "Connected" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
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
                {c.disposition ? (
                  <span className="mt-2 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {c.disposition}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
