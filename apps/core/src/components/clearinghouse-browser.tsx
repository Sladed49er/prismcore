"use client";

import { useMemo, useState, useTransition } from "react";
import {
  connect,
  disconnect,
} from "@/app/(shell)/m/api_clearinghouse/actions";

export interface CarrierDTO {
  id: string;
  name: string;
  type: "carrier" | "mga";
  description: string;
  lines: string[];
  states: string[];
  appetite: string;
  apiStatus: "live" | "coming_soon";
}

/**
 * The clearinghouse marketplace — search the shared carrier/MGA pool and connect
 * what the agency needs. One connection, every market.
 */
export function ClearinghouseBrowser({
  carriers,
  connectedIds,
}: {
  carriers: CarrierDTO[];
  connectedIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [line, setLine] = useState("");
  const [pending, startTransition] = useTransition();
  const connected = useMemo(() => new Set(connectedIds), [connectedIds]);

  const allLines = useMemo(() => {
    const set = new Set<string>();
    for (const c of carriers) for (const l of c.lines) set.add(l);
    return [...set].sort();
  }, [carriers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return carriers.filter((c) => {
      if (line && !c.lines.includes(line)) return false;
      if (!q) return true;
      const haystack = [
        c.name,
        c.description,
        c.appetite,
        ...c.lines,
        ...c.states,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [carriers, query, line]);

  function toggle(id: string, isConnected: boolean): void {
    startTransition(async () => {
      if (isConnected) await disconnect(id);
      else await connect(id);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markets — try 'cannabis' or 'trucking'…"
          aria-label="Search the carrier pool"
          className="min-w-64 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <select
          value={line}
          onChange={(e) => setLine(e.target.value)}
          aria-label="Filter by line of business"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">All lines of business</option>
          {allLines.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {filtered.length} of {carriers.length} markets · {connected.size}{" "}
        connected
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {filtered.map((c) => {
          const isConnected = connected.has(c.id);
          return (
            <div
              key={c.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {c.type === "mga" ? "MGA / Wholesaler" : "Carrier"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.apiStatus === "live"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {c.apiStatus === "live" ? "API live" : "Coming soon"}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{c.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.lines.map((l) => (
                  <span
                    key={l}
                    className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                  >
                    {l}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {c.states.includes("nationwide")
                  ? "Nationwide"
                  : c.states.join(", ")}
              </p>
              <p className="mt-1 text-xs text-gray-400">{c.appetite}</p>
              <button
                type="button"
                onClick={() => toggle(c.id, isConnected)}
                disabled={pending}
                className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  isConnected
                    ? "border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {isConnected ? "Connected — disconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-400">
          No markets match that search.
        </p>
      ) : null}
    </div>
  );
}
