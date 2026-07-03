"use client";

import { useState, useTransition } from "react";

/**
 * Rankings panel — real Google positions from Search Console for the
 * tenant's tracked keywords. Refreshed weekly by cron, or on demand.
 */

export interface RankingRowDTO {
  phrase: string;
  position: number | null;
  previousPosition: number | null;
  checkedAt: string;
}

export function SeoRankingsPanel({
  rows,
  refresh,
}: {
  rows: RankingRowDTO[];
  refresh: () => Promise<{ ok: boolean; message: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function run(): void {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      const result = await refresh();
      setMessage(result.message);
    });
  }

  const trend = (row: RankingRowDTO): string => {
    if (row.position === null || row.previousPosition === null) return "";
    if (row.position < row.previousPosition)
      return `↑${row.previousPosition - row.position}`;
    if (row.position > row.previousPosition)
      return `↓${row.position - row.previousPosition}`;
    return "→";
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Google rankings
          </h2>
          <p className="text-sm text-gray-500">
            Real positions from Search Console for your tracked keywords —
            updated weekly.
          </p>
        </div>
        <button
          onClick={run}
          disabled={pending}
          className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Refreshing…" : "Refresh now"}
        </button>
      </div>

      {message && !pending && (
        <p className="mt-3 text-sm text-gray-600">{message}</p>
      )}

      {rows.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-100">
          {rows.map((row) => (
            <li key={row.phrase} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 text-gray-900">{row.phrase}</span>
              <span
                className={
                  row.position === null
                    ? "text-gray-400"
                    : row.position <= 10
                      ? "font-semibold text-emerald-600"
                      : row.position <= 30
                        ? "font-semibold text-amber-600"
                        : "font-semibold text-gray-700"
                }
              >
                {row.position === null ? "not ranking" : `#${row.position}`}
              </span>
              <span className="w-8 text-xs text-gray-500">{trend(row)}</span>
              <span className="text-xs text-gray-400">
                {new Date(row.checkedAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-400">
          No ranking data yet — add tracked keywords, then refresh.
        </p>
      )}
    </section>
  );
}
