"use client";

import type { LogEntryDTO } from "@/components/customize-hub";

/**
 * The customization history — an append-only record of every change to this
 * workspace, by a person or by the AI assistant. This is the "historical
 * document": which fields existed, what they were called, when they changed,
 * and who changed them — so data can always be matched up later.
 */
export function HistoryPanel({ log }: { log: LogEntryDTO[] }) {
  if (log.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
        No customization changes yet. Every change you or the assistant make
        will be recorded here.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-100">
        {log.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                entry.actorType === "ai"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {entry.actorType === "ai" ? "AI" : "User"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800">{entry.summary}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {entry.actorName} ·{" "}
                {new Date(entry.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
