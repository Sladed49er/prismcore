"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { SiteAuditReport } from "@/lib/seo-site-audit";

/**
 * Deep site analysis panel — kicks off the whole-site crawl and renders the
 * report: score, category grades, executive summary, prioritized actions,
 * site-wide issues, and the worst pages. The crawl runs minutes, so the
 * panel narrates progress stages by elapsed time while the action runs.
 */

const STAGES: [number, string][] = [
  [0, "Reading robots.txt and sitemap…"],
  [8, "Crawling pages…"],
  [60, "Still crawling — bigger site than most…"],
  [150, "Checking internal links…"],
  [190, "AI is writing your action plan…"],
];

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-red-600";
}

const IMPACT_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-gray-100 text-gray-700",
};

export interface SavedAuditDTO {
  id: string;
  siteUrl: string;
  score: number;
  createdAt: string;
}

export function SeoSiteAuditPanel({
  action,
  saved = [],
  load,
}: {
  action: (url: string, force?: boolean) => Promise<SiteAuditReport>;
  saved?: SavedAuditDTO[];
  load?: (id: string) => Promise<SiteAuditReport | null>;
}) {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<SiteAuditReport | null>(null);
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

  function run(force = false, target?: string): void {
    const site = (target ?? url).trim();
    if (!site || pending) return;
    setReport(null);
    startTransition(async () => {
      setReport(await action(site, force));
    });
  }

  function view(id: string): void {
    if (!load || pending) return;
    setReport(null);
    startTransition(async () => {
      const loaded = await load(id);
      if (loaded) {
        setReport(loaded);
        if (loaded.root) setUrl(loaded.root);
      }
    });
  }

  async function downloadPdf(): Promise<void> {
    if (!report) return;
    const { buildPdf } = await import("./seo-site-audit-pdf");
    buildPdf(report).save(
      `seo-site-audit-${new URL(report.root).hostname}.pdf`,
    );
  }

  const stage =
    [...STAGES].reverse().find(([at]) => elapsed >= at)?.[1] ?? STAGES[0]![1];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-900">
        Deep site analysis
      </h2>
      <p className="text-sm text-gray-500">
        Crawls your whole site — sitemap, every page, internal links — and
        delivers a graded report with a prioritized action plan. Takes a few
        minutes.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          placeholder="https://www.yoursite.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          disabled={pending}
        />
        <button
          onClick={() => run()}
          disabled={pending || !url.trim()}
          className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Analyzing…" : "Analyze site"}
        </button>
      </div>

      {pending && (
        <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
          <span className="font-medium">{stage}</span>
          <span className="ml-2 text-indigo-900/60">{elapsed}s</span>
        </div>
      )}

      {report?.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {report.error}
        </p>
      )}

      {!pending && !report && saved.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Recent reports
          </h3>
          <ul className="mt-2 divide-y divide-gray-100">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 break-all text-gray-900">
                  {s.siteUrl}
                </span>
                <span className={`font-semibold ${scoreColor(s.score)}`}>
                  {s.score}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
                {load && (
                  <button
                    onClick={() => view(s.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    View
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report && !report.error && (
        <div className="mt-6 space-y-6">
          {report.fromCache && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
              <span className="min-w-0 flex-1">
                This is a saved report from{" "}
                {report.generatedAt
                  ? new Date(report.generatedAt).toLocaleString()
                  : "earlier"}
                . Changed your site since then? Re-run to see the new score.
              </span>
              <button
                onClick={() => run(true, report.root)}
                className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500"
              >
                Re-run analysis
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className={`text-5xl font-bold ${scoreColor(report.score)}`}>
                {report.score}
              </div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Site score
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {report.categoryScores.map((c) => (
                <div
                  key={c.label}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-center"
                >
                  <div className={`text-lg font-semibold ${scoreColor(c.score)}`}>
                    {c.score}
                  </div>
                  <div className="text-xs text-gray-500">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="ml-auto text-right text-xs text-gray-500">
              <div>
                {report.pagesCrawled} pages crawled
                {report.truncated ? " (capped)" : ""}
              </div>
              <div>{Math.round(report.durationMs / 1000)}s</div>
              <div className="mt-1 flex flex-col items-end gap-1">
                <button
                  onClick={downloadPdf}
                  className="font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Download PDF report
                </button>
                {/* Always offer a fresh crawl from the report itself — the
                    cache banner only shows for saved reports, and members
                    re-run right after shipping fixes. */}
                <button
                  onClick={() => run(true, report.root)}
                  className="font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Re-run analysis
                </button>
              </div>
            </div>
          </div>

          {report.summary && (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              {report.summary}
            </p>
          )}

          {report.actions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Action plan
              </h3>
              <ol className="mt-2 space-y-2">
                {report.actions.map((a, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-gray-200 p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold uppercase ${IMPACT_STYLES[a.impact] ?? IMPACT_STYLES.low}`}
                      >
                        {a.impact}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {a.title}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-600">{a.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Missing titles", report.stats.missingTitle],
              ["Missing meta descriptions", report.stats.missingMeta],
              ["Missing H1s", report.stats.missingH1],
              ["Thin pages", report.stats.thinPages],
              [
                "Images w/o alt text",
                `${report.stats.imagesMissingAlt}/${report.stats.imagesTotal}`,
              ],
              ["Broken internal links", report.brokenLinks.length],
              ["Duplicate titles", report.duplicateTitles.length],
              ["No structured data", report.stats.missingStructuredData],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-lg border border-gray-200 p-3"
              >
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {report.brokenLinks.length > 0 && (
            <details className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                Broken internal links ({report.brokenLinks.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                {report.brokenLinks.map((l) => (
                  <li key={l.url} className="break-all">
                    <span className="font-mono text-red-600">{l.status}</span>{" "}
                    {l.url}{" "}
                    <span className="text-gray-400">on {l.foundOn}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {report.duplicateTitles.length > 0 && (
            <details className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                Duplicate titles ({report.duplicateTitles.length} groups)
              </summary>
              <ul className="mt-2 space-y-2 text-xs text-gray-600">
                {report.duplicateTitles.map((g) => (
                  <li key={g.value}>
                    <div className="font-medium text-gray-800">
                      &quot;{g.value}&quot;
                    </div>
                    {g.urls.map((u) => (
                      <div key={u} className="break-all pl-3">
                        {u}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Pages needing the most work
            </h3>
            <ul className="mt-2 space-y-2">
              {report.pages
                .filter((p) => p.failCount + p.warnCount > 0)
                .slice(0, 15)
                .map((p) => (
                  <li key={p.url}>
                    <details className="rounded-lg border border-gray-200 p-3">
                      <summary className="cursor-pointer text-sm">
                        <span className="font-medium text-gray-900 break-all">
                          {p.url}
                        </span>{" "}
                        <span className="text-xs text-red-600">
                          {p.failCount} fails
                        </span>{" "}
                        <span className="text-xs text-amber-600">
                          {p.warnCount} warns
                        </span>
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-gray-600">
                        {p.findings.map((f) => (
                          <li key={f.id}>
                            <span
                              className={
                                f.status === "fail"
                                  ? "font-semibold text-red-600"
                                  : "font-semibold text-amber-600"
                              }
                            >
                              {f.label}:
                            </span>{" "}
                            {f.detail}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
