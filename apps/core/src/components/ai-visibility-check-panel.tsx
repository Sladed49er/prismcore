"use client";

import { useState, useTransition } from "react";
import type { VisibilityCheckResult } from "@/app/prismseo/actions";

/**
 * One-off AI visibility check for PrismOptimize members: ask the question a
 * prospect would ask an AI assistant and see whether your business is part
 * of the answer.
 */

export function AiVisibilityCheckPanel({
  action,
}: {
  action: (input: {
    query: string;
    orgName: string;
    siteUrl: string;
  }) => Promise<VisibilityCheckResult>;
}) {
  const [query, setQuery] = useState("");
  const [orgName, setOrgName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [result, setResult] = useState<VisibilityCheckResult | null>(null);
  const [pending, startTransition] = useTransition();

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";

  function run(): void {
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      setResult(await action({ query, orgName, siteUrl }));
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-900">
        AI visibility check
      </h2>
      <p className="text-sm text-gray-500">
        When a prospect asks an AI assistant, do you come up? We ask the
        question with live web search and check the answer for you.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            The question a prospect would ask
          </span>
          <input
            className={inputClass}
            placeholder="best independent insurance agency in Wenatchee"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Your business name
          </span>
          <input
            className={inputClass}
            placeholder="Acme Insurance Group"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Your website (optional)
          </span>
          <input
            className={inputClass}
            placeholder="https://www.acmeinsurance.com"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            disabled={pending}
          />
        </label>
      </div>

      <button
        onClick={run}
        disabled={pending || !query.trim() || !orgName.trim()}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? "Asking the AI…" : "Check my visibility"}
      </button>

      {result && !result.ok && result.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <div
          className={`mt-4 rounded-lg border p-4 ${
            result.mentioned
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              result.mentioned ? "text-emerald-800" : "text-amber-800"
            }`}
          >
            {result.mentioned
              ? "You're in the answer. The AI mentioned your business."
              : "Not mentioned — the AI answered without you."}
          </p>
          {result.excerpt && (
            <p className="mt-2 text-xs text-gray-600">“{result.excerpt}”</p>
          )}
          {!result.mentioned && (
            <p className="mt-2 text-xs text-amber-800/80">
              This is what the SEO Engine fixes: publish authoritative,
              well-structured content on the topics you want to own.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
