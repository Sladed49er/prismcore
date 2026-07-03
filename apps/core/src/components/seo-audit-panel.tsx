"use client";

import { useState, useTransition } from "react";
import type { AuditReport, AuditStatus } from "@/lib/seo-audit";

/**
 * One-off SEO audit: URL in, graded checks + AI suggestions out. The server
 * action is passed in so the SEO Engine module and the public PrismSEO page
 * share one panel with different backends (authenticated vs rate-limited).
 */

const STATUS_STYLE: Record<AuditStatus, { badge: string; label: string }> = {
  pass: { badge: "bg-emerald-50 text-emerald-700", label: "Pass" },
  warn: { badge: "bg-amber-50 text-amber-700", label: "Warn" },
  fail: { badge: "bg-red-50 text-red-700", label: "Fail" },
};

export function SeoAuditPanel({
  action,
  heading = "One-off audit",
  subheading = "Check any page's on-page SEO and get prioritized suggestions.",
}: {
  action: (url: string) => Promise<AuditReport>;
  heading?: string;
  subheading?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<AuditReport | null>(null);

  function run(): void {
    if (!url.trim()) return;
    setReport(null);
    startTransition(async () => {
      setReport(await action(url.trim()));
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-900">{heading}</h2>
      <p className="text-sm text-gray-500">{subheading}</p>

      <div className="mt-4 flex gap-2">
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="https://www.example.com/some-page"
        />
        <button
          onClick={run}
          disabled={pending || !url.trim()}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Auditing…" : "Run audit"}
        </button>
      </div>

      {report && !report.fetched && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {report.error ?? "The audit failed."}
        </p>
      )}

      {report?.fetched && (
        <div className="mt-4 space-y-4">
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {report.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-3 p-3">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[check.status].badge}`}
                >
                  {STATUS_STYLE[check.status].label}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {check.label}
                  </p>
                  <p className="text-sm text-gray-500">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          {report.suggestions.length > 0 && (
            <div className="rounded-lg bg-indigo-50 p-4">
              <h3 className="text-sm font-semibold text-indigo-900">
                Suggested improvements
              </h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-indigo-900">
                {report.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
