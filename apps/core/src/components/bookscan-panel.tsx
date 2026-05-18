"use client";

import { useState, useTransition } from "react";
import { analyzeBook, removeReport } from "@/app/(shell)/m/bookscan/actions";
import type {
  BookScanFinding,
  BookScanComposition,
} from "@/lib/bookscan";

export interface BookScanReportDTO {
  id: string;
  generatedBy: string;
  createdAt: string;
  totalClients: number;
  totalPolicies: number;
  totalPremiumCents: number;
  summary: string;
  findings: BookScanFinding[];
  composition: BookScanComposition | null;
}

const SENTIMENT_STYLE: Record<
  BookScanFinding["sentiment"],
  { dot: string; label: string }
> = {
  positive: { dot: "bg-emerald-500", label: "Strength" },
  watch: { dot: "bg-amber-500", label: "Watch" },
  risk: { dot: "bg-rose-500", label: "Risk" },
};

function money(cents: number): string {
  return "$" + Math.round(cents / 100).toLocaleString();
}

function CompositionBars({
  title,
  buckets,
}: {
  title: string;
  buckets: { label: string; policies: number; premiumCents: number }[];
}) {
  const max = Math.max(1, ...buckets.map((b) => b.premiumCents));
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      <div className="mt-2 space-y-1.5">
        {buckets.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-xs text-gray-600">
              <span className="truncate">{b.label}</span>
              <span className="shrink-0 pl-2">
                {money(b.premiumCents)} · {b.policies}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-400"
                style={{ width: `${(b.premiumCents / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookScanPanel({
  reports,
}: {
  reports: BookScanReportDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const latest = reports[0] ?? null;
  const history = reports.slice(1);

  function run(): void {
    setNotice(null);
    startTransition(async () => {
      const result = await analyzeBook();
      setNotice(result.message);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this analysis?")) return;
    startTransition(async () => {
      await removeReport(id);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {reports.length} analys{reports.length === 1 ? "is" : "es"} on record
        </p>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Analyzing…" : "✨ Run new analysis"}
        </button>
      </div>

      {notice ? (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          {notice}
        </p>
      ) : null}

      {!latest ? (
        <p className="mt-5 rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
          No analysis yet. Run BookScan to get a read on your book of business.
        </p>
      ) : (
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest analysis</h2>
            <span className="text-xs text-gray-400">
              {new Date(latest.createdAt).toLocaleString()}
              {latest.generatedBy ? ` · ${latest.generatedBy}` : ""}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">Clients</p>
              <p className="text-xl font-semibold">
                {latest.totalClients.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">Policies</p>
              <p className="text-xl font-semibold">
                {latest.totalPolicies.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">In-force premium</p>
              <p className="text-xl font-semibold">
                {money(latest.totalPremiumCents)}
              </p>
            </div>
          </div>

          {latest.summary ? (
            <p className="mt-4 text-sm leading-relaxed text-gray-700">
              {latest.summary}
            </p>
          ) : null}

          {latest.findings.length > 0 ? (
            <div className="mt-5 space-y-2">
              {latest.findings.map((f, i) => {
                const style = SENTIMENT_STYLE[f.sentiment];
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-100 bg-gray-50/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {f.category || style.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {f.title}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-600">{f.detail}</p>
                  </div>
                );
              })}
            </div>
          ) : null}

          {latest.composition ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <CompositionBars
                title="By line of business"
                buckets={latest.composition.byLine}
              />
              <CompositionBars
                title="By carrier"
                buckets={latest.composition.byCarrier}
              />
            </div>
          ) : null}
        </div>
      )}

      {history.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Previous analyses
          </h3>
          <div className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {history.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="text-gray-600">
                  {new Date(r.createdAt).toLocaleDateString()} ·{" "}
                  {r.totalPolicies.toLocaleString()} policies ·{" "}
                  {money(r.totalPremiumCents)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={pending}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
