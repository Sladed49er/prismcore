"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { SiteAuditReport } from "@/lib/seo-site-audit";
import type { ContentFillResult } from "@/lib/seo-content-fill";
import { CHECK_EXPLAINERS, SEO_GLOSSARY } from "@/lib/seo-glossary";

/**
 * Deep site analysis panel — kicks off the whole-site crawl and renders the
 * report: score, category grades, executive summary, prioritized actions,
 * site-wide issues, and the worst pages. The crawl runs minutes, so the
 * panel narrates progress stages by elapsed time while the action runs.
 */

const STAGES: [number, string][] = [
  [0, "Reading robots.txt and sitemap…"],
  [8, "Crawling pages…"],
  [120, "Still crawling — bigger site than most…"],
  [300, "Big site — working through hundreds of pages…"],
  [620, "Checking internal links…"],
  [690, "AI is writing your action plan…"],
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
  draftFill,
  remove,
}: {
  action: (url: string, force?: boolean) => Promise<SiteAuditReport>;
  saved?: SavedAuditDTO[];
  load?: (id: string) => Promise<SiteAuditReport | null>;
  /** AI filler-copy drafter for thin-content findings (optional). */
  draftFill?: (url: string) => Promise<ContentFillResult>;
  /** Permanently delete a saved report (optional). */
  remove?: (id: string) => Promise<boolean>;
}) {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<SiteAuditReport | null>(null);
  const [pending, startTransition] = useTransition();
  // AI filler drafts, keyed by page URL: undefined = untouched,
  // "loading" = in flight, otherwise the action's result.
  const [fills, setFills] = useState<
    Record<string, "loading" | ContentFillResult>
  >({});
  // Local copy of the saved-report history so deletes reflect immediately.
  const [history, setHistory] = useState<SavedAuditDTO[]>(saved);
  const [showAll, setShowAll] = useState(false);
  // Column sorting for the history table. Default: newest first.
  const [sortKey, setSortKey] = useState<"siteUrl" | "score" | "createdAt">(
    "createdAt",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Two-step delete: first click arms the row, second click deletes.
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => setHistory(saved), [saved]);
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

  async function requestFill(url: string): Promise<void> {
    if (!draftFill || fills[url] === "loading") return;
    setFills((f) => ({ ...f, [url]: "loading" }));
    const result = await draftFill(url).catch(
      (): ContentFillResult => ({ ok: false, error: "The draft failed." }),
    );
    setFills((f) => ({ ...f, [url]: result }));
  }

  async function confirmDelete(id: string): Promise<void> {
    if (!remove) return;
    if (armed !== id) {
      setArmed(id);
      return;
    }
    setArmed(null);
    const ok = await remove(id).catch(() => false);
    if (ok) setHistory((h) => h.filter((s) => s.id !== id));
  }

  function toggleSort(key: "siteUrl" | "score" | "createdAt"): void {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Sensible first direction per column: sites A-Z, numbers high-first.
      setSortDir(key === "siteUrl" ? "asc" : "desc");
    }
  }

  const sortedHistory = [...history].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "score") return (a.score - b.score) * dir;
    if (sortKey === "siteUrl") return a.siteUrl.localeCompare(b.siteUrl) * dir;
    return a.createdAt.localeCompare(b.createdAt) * dir;
  });

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
        delivers a graded report with a prioritized action plan. A few minutes
        for most sites; large sites (thousands of pages) can take ten.
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

      {!pending && !report && history.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Report history{" "}
            <span className="font-normal normal-case text-gray-400">
              — every run is kept until you delete it
            </span>
          </h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                {(
                  [
                    ["siteUrl", "Site"],
                    ["score", "Score"],
                    ["createdAt", "Date"],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} className="py-1.5 pr-3 font-semibold">
                    <button
                      onClick={() => toggleSort(key)}
                      className="hover:text-indigo-600"
                    >
                      {label}
                      {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  </th>
                ))}
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(showAll ? sortedHistory : sortedHistory.slice(0, 12)).map(
                (s) => (
                  <tr key={s.id}>
                    <td className="min-w-0 break-all py-2 pr-3 text-gray-900">
                      {s.siteUrl}
                    </td>
                    <td
                      className={`py-2 pr-3 font-semibold ${scoreColor(s.score)}`}
                    >
                      {s.score}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-gray-400">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right">
                      {load && (
                        <button
                          onClick={() => view(s.id)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                        >
                          View
                        </button>
                      )}
                      {remove && (
                        <button
                          onClick={() => confirmDelete(s.id)}
                          onBlur={() => setArmed(null)}
                          className={
                            armed === s.id
                              ? "ml-3 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-500"
                              : "ml-3 text-xs font-semibold text-gray-400 hover:text-red-600"
                          }
                        >
                          {armed === s.id ? "Really delete?" : "Delete"}
                        </button>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {history.length > 12 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
            >
              {showAll
                ? "Show recent only"
                : `Show all ${history.length} reports`}
            </button>
          )}
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
            {(() => {
              // Site-level penalties are subtracted from the page-score mean —
              // surface them so a 95 under all-100 tiles is never a mystery.
              const pens: string[] = [];
              if (report.brokenLinks.length > 0)
                pens.push(
                  `broken links −${Math.min(10, report.brokenLinks.length)}`,
                );
              if (report.duplicateTitles.length > 0)
                pens.push("duplicate titles −5");
              if (!report.technical.sitemapFound) pens.push("no sitemap −5");
              if (report.technical.httpRedirectsToHttps === false)
                pens.push("no https redirect −5");
              if (report.technical.wwwVariantRedirects === false)
                pens.push("www variant −3");
              return pens.length > 0 ? (
                <div className="basis-full text-xs text-amber-700">
                  Site-wide penalties: {pens.join(", ")}
                </div>
              ) : null;
            })()}
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
            {(
              [
                [
                  "Missing titles",
                  report.stats.missingTitle,
                  "The title is the clickable blue headline on a Google result. Every page needs its own.",
                ],
                [
                  "Missing meta descriptions",
                  report.stats.missingMeta,
                  "The blurb Google shows under the headline. Without one, Google improvises.",
                ],
                [
                  "Missing H1s",
                  report.stats.missingH1,
                  "The page's main on-page headline. Use exactly one per page.",
                ],
                [
                  "Thin pages",
                  report.stats.thinPages,
                  "Under ~150 words of text. Pages with little to say rarely rank.",
                ],
                [
                  "Images w/o alt text",
                  `${report.stats.imagesMissingAlt}/${report.stats.imagesTotal}`,
                  "Alt text describes an image for screen readers and for Google.",
                ],
                [
                  "Broken internal links",
                  report.brokenLinks.length,
                  "Links on the site that lead to dead pages (404 errors).",
                ],
                [
                  "Duplicate titles",
                  report.duplicateTitles.length,
                  "Pages sharing one title compete with each other in Google.",
                ],
                [
                  "No structured data",
                  report.stats.missingStructuredData,
                  "Machine-readable business facts that unlock rich Google results.",
                ],
              ] as const
            ).map(([label, value, explain]) => (
              <div
                key={label}
                className="rounded-lg border border-gray-200 p-3"
              >
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {value}
                </dd>
                <p className="mt-1 text-[11px] leading-snug text-gray-400">
                  {explain}
                </p>
              </div>
            ))}
          </dl>

          {report.brokenLinks.length > 0 && (
            <details className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                Broken internal links ({report.brokenLinks.length})
              </summary>
              <p className="mt-1 text-xs text-gray-400">
                Links on your own site that lead to dead pages — visitors hit
                an error, and Google reads it as neglect. Fix the link or the
                page it points to.
              </p>
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
              <p className="mt-1 text-xs text-gray-400">
                These pages share the same headline in Google, so they compete
                with each other and Google can&apos;t tell them apart. Give
                each page a title that says what makes it different.
              </p>
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
                          <li
                            key={f.id}
                            title={CHECK_EXPLAINERS[f.id]}
                            className={
                              CHECK_EXPLAINERS[f.id] ? "cursor-help" : ""
                            }
                          >
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
                      {draftFill &&
                        p.findings.some((f) => f.id === "content") && (
                          <div className="mt-3">
                            {(() => {
                              const fill = fills[p.url];
                              if (!fill)
                                return (
                                  <button
                                    onClick={() => requestFill(p.url)}
                                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                  >
                                    ✨ Draft filler copy with AI
                                  </button>
                                );
                              if (fill === "loading")
                                return (
                                  <p className="text-xs text-indigo-600">
                                    Reading the page and drafting…
                                  </p>
                                );
                              if (!fill.ok)
                                return (
                                  <p className="text-xs text-red-600">
                                    {fill.error}
                                  </p>
                                );
                              return (
                                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                                  <p className="mb-1 text-xs font-semibold text-indigo-900">
                                    Paste below your existing copy — grounded
                                    in what the page already says, nothing
                                    invented:
                                  </p>
                                  <p className="whitespace-pre-wrap text-xs text-gray-800">
                                    {fill.draft}
                                  </p>
                                  <button
                                    onClick={() =>
                                      navigator.clipboard.writeText(
                                        fill.draft ?? "",
                                      )
                                    }
                                    className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                                  >
                                    Copy to clipboard
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                    </details>
                  </li>
                ))}
            </ul>
          </div>

          <details className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900">
              What these terms mean — plain-English glossary
            </summary>
            <p className="mt-1 text-xs text-gray-400">
              Every technical term in this report, explained. Also included on
              the last page of the PDF, so the report travels without a
              translator.
            </p>
            <dl className="mt-3 space-y-2.5 text-xs">
              {SEO_GLOSSARY.map((g) => (
                <div key={g.term}>
                  <dt className="font-semibold text-gray-800">{g.term}</dt>
                  <dd className="mt-0.5 text-gray-600">{g.plain}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      )}
    </section>
  );
}
