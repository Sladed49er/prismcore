"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { CompareResult } from "@/lib/seo-compare";

/**
 * Multi-site comparison panel: enter up to six domains (one per line), all
 * audit in parallel — sites with a fresh saved report return instantly —
 * and the results render side by side with the best value per row
 * highlighted, an AI comparative summary, and a PDF download.
 */

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-red-600";
}

export function SeoComparePanel({
  action,
}: {
  action: (urls: string[]) => Promise<CompareResult>;
}) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pending) {
      const started = Date.now();
      timer.current = setInterval(
        () => setElapsed(Math.round((Date.now() - started) / 1000)),
        1000,
      );
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
      setElapsed(0);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [pending]);

  const urls = input
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  function run(): void {
    if (urls.length < 2 || pending) return;
    setResult(null);
    startTransition(async () => {
      setResult(await action(urls));
    });
  }

  async function downloadPdf(): Promise<void> {
    if (!result?.ok) return;
    const { buildComparePdf } = await import("./seo-compare-pdf");
    buildComparePdf(result).save("seo-comparison-report.pdf");
  }

  const sites = result?.ok ? result.sites.filter((s) => !s.error) : [];
  const failed = result?.ok ? result.sites.filter((s) => s.error) : [];

  // Metric rows: label, per-site value, and whether lower is better.
  const rows: [string, (s: (typeof sites)[number]) => number, boolean][] = [
    ["Content", (s) => s.categoryScores.find((c) => c.label === "Content")?.score ?? 0, false],
    ["Technical", (s) => s.categoryScores.find((c) => c.label === "Technical")?.score ?? 0, false],
    ["Social", (s) => s.categoryScores.find((c) => c.label === "Social")?.score ?? 0, false],
    ["Accessibility", (s) => s.categoryScores.find((c) => c.label === "Accessibility")?.score ?? 0, false],
    ["Pages crawled", (s) => s.pagesCrawled, false],
    ["Thin pages", (s) => s.thinPages, true],
    ["Missing titles", (s) => s.missingTitle, true],
    ["Missing meta descriptions", (s) => s.missingMeta, true],
    ["Missing H1s", (s) => s.missingH1, true],
    ["Images without alt text", (s) => s.imagesMissingAlt, true],
    ["Broken internal links", (s) => s.brokenLinks, true],
    ["Duplicate title groups", (s) => s.duplicateTitles, true],
  ];

  const best = (values: number[], lowerIsBetter: boolean): number =>
    lowerIsBetter ? Math.min(...values) : Math.max(...values);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-900">Compare sites</h2>
      <p className="text-sm text-gray-500">
        Audit up to ten domains side by side — yours first, competitors
        after. Sites with a report from the last 24 hours return instantly;
        the rest crawl in parallel.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <textarea
          className="min-h-[92px] w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500"
          placeholder={"https://www.yoursite.com\nhttps://competitor-one.com\nhttps://competitor-two.com"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
        />
        <button
          onClick={run}
          disabled={pending || urls.length < 2}
          className="self-start whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Comparing…" : `Compare ${urls.length >= 2 ? urls.length + " sites" : "sites"}`}
        </button>
      </div>

      {pending && (
        <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
          <span className="font-medium">
            Auditing {urls.length} sites in parallel…
          </span>
          <span className="ml-2 text-indigo-900/60">{elapsed}s</span>
        </div>
      )}

      {result && !result.ok && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {result.error}
        </p>
      )}

      {result?.ok && sites.length > 0 && (
        <div className="mt-6 space-y-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-3 text-xs font-semibold text-gray-500">
                    Site score
                  </th>
                  {sites.map((s) => (
                    <th key={s.url} className="py-2 pr-4">
                      <div className="break-all text-xs font-semibold text-gray-900">
                        {s.host}
                      </div>
                      <div className={`text-2xl font-bold ${scoreColor(s.score)}`}>
                        {s.score}
                      </div>
                      {s.fromCache && (
                        <div className="text-[10px] text-gray-400">
                          saved report
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(([label, get, lowerIsBetter]) => {
                  const values = sites.map(get);
                  const winner = best(values, lowerIsBetter);
                  const tie = values.every((v) => v === winner);
                  return (
                    <tr key={label}>
                      <td className="py-1.5 pr-3 text-xs text-gray-500">
                        {label}
                      </td>
                      {values.map((v, i) => (
                        <td
                          key={sites[i]!.url}
                          className={`py-1.5 pr-4 font-medium ${
                            !tie && v === winner
                              ? "text-emerald-700"
                              : "text-gray-700"
                          }`}
                        >
                          {v}
                          {!tie && v === winner && " ✓"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {failed.length > 0 && (
            <p className="text-xs text-red-600">
              Couldn&apos;t audit: {failed.map((s) => s.host).join(", ")}
            </p>
          )}

          {result.summary && (
            <p className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              {result.summary}
            </p>
          )}

          <button
            onClick={downloadPdf}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Download comparison PDF
          </button>
        </div>
      )}
    </section>
  );
}
