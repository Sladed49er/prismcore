"use client";

import { useState, useTransition } from "react";

/**
 * Weekly monitoring panel — the member's watched sites. Adding a site queues
 * it for the daily cron sweep; each site gets a re-audit and an email report
 * roughly weekly.
 */

export interface MonitorDTO {
  id: string;
  siteUrl: string;
  lastScore: number | null;
  lastRunAt: string | null;
}

export function SeoMonitorPanel({
  monitors,
  add,
  remove,
}: {
  monitors: MonitorDTO[];
  add: (url: string) => Promise<string>;
  remove: (id: string) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(): void {
    if (!url.trim() || pending) return;
    startTransition(async () => {
      const message = await add(url.trim());
      setError(message);
      if (!message) setUrl("");
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-900">
        Weekly monitoring
      </h2>
      <p className="text-sm text-gray-500">
        We re-audit your sites every week and email you the score, what
        changed, and the top priorities.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          placeholder="https://www.yoursite.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={pending}
        />
        <button
          onClick={submit}
          disabled={pending || !url.trim()}
          className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Monitor site"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {monitors.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-100">
          {monitors.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 break-all font-medium text-gray-900">
                {m.siteUrl}
              </span>
              <span className="text-gray-500">
                {m.lastScore !== null
                  ? `${m.lastScore}/100`
                  : "first report within a day"}
              </span>
              {m.lastRunAt && (
                <span className="text-xs text-gray-400">
                  {new Date(m.lastRunAt).toLocaleDateString()}
                </span>
              )}
              <button
                onClick={() => startTransition(() => remove(m.id))}
                className="text-xs font-semibold text-gray-400 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
