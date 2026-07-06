"use client";

import { useState, useTransition } from "react";

/**
 * AI visibility panel — whether AI answer engines mention this organization
 * when asked its tracked queries. Shows the latest check per query and a
 * run-now button; the weekly cron keeps the series current in between.
 */

export interface VisibilityCheckDTO {
  query: string;
  mentioned: boolean;
  excerpt: string;
  checkedAt: string;
}

export function SeoVisibilityPanel({
  checks,
  run,
}: {
  checks: VisibilityCheckDTO[];
  run: () => Promise<{ ok: boolean; message: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const mentions = checks.filter((c) => c.mentioned).length;

  function start(): void {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      const result = await run();
      setMessage(result.message);
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            AI visibility
          </h2>
          <p className="text-sm text-gray-500">
            When someone asks an AI assistant your tracked questions, do you
            come up? Checked weekly, or on demand. This is &quot;GEO&quot;
            (generative engine optimization) — being the business AI
            assistants recommend, the way SEO gets you into Google results.
          </p>
        </div>
        <button
          onClick={start}
          disabled={pending}
          className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Checking…" : "Run checks now"}
        </button>
      </div>

      {pending && (
        <p className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
          Asking the AI engine each tracked query with live web search — about
          10-20 seconds per query…
        </p>
      )}
      {message && !pending && (
        <p className="mt-3 text-sm text-gray-600">{message}</p>
      )}

      {checks.length > 0 && (
        <>
          <p className="mt-4 text-sm font-medium text-gray-900">
            Mentioned in{" "}
            <span
              className={mentions > 0 ? "text-emerald-600" : "text-red-600"}
            >
              {mentions} of {checks.length}
            </span>{" "}
            answers
          </p>
          <ul className="mt-2 divide-y divide-gray-100">
            {checks.map((c) => (
              <li key={c.query} className="py-2">
                <details>
                  <summary className="flex cursor-pointer items-center gap-3 text-sm">
                    <span
                      className={
                        c.mentioned
                          ? "font-semibold text-emerald-600"
                          : "font-semibold text-red-500"
                      }
                    >
                      {c.mentioned ? "✓" : "✗"}
                    </span>
                    <span className="min-w-0 flex-1 text-gray-900">
                      {c.query}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.checkedAt).toLocaleDateString()}
                    </span>
                  </summary>
                  {c.excerpt && (
                    <p className="mt-2 rounded-lg bg-gray-50 p-3 pl-8 text-xs text-gray-600">
                      {c.excerpt}
                    </p>
                  )}
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
      {checks.length === 0 && !pending && (
        <p className="mt-4 text-sm text-gray-400">
          No checks yet — add tracked keywords, then run the first check.
        </p>
      )}
    </section>
  );
}
