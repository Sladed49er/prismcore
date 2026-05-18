"use client";

import { useState, useTransition } from "react";
import type { RiskAssessment } from "@/lib/voip-risk";
import type { WeeklyDigestData, DigestInsights } from "@/lib/voip-digest";
import type { RecentContact, CallerBrief } from "@/lib/voip-caller-brief";
import {
  scanCalls,
  runRiskRadar,
  generateDigest,
  callerBrief,
  updateInsight,
  resolveFlag,
} from "@/app/(shell)/m/telephony/intelligence/actions";

export interface InsightDTO {
  id: string;
  kind: string;
  title: string;
  detail: string;
  priority: string;
  estimatedValue: string;
  productType: string;
  dueDate: string | null;
  contactName: string;
  status: string;
  createdAt: string;
}

export interface FlagDTO {
  id: string;
  category: string;
  severity: string;
  title: string;
  detail: string;
  regulation: string;
  contactName: string;
  status: string;
  createdAt: string;
}

export interface DigestDTO {
  id: string;
  periodStart: string;
  periodEnd: string;
  data: WeeklyDigestData;
  insights: DigestInsights;
  createdAt: string;
}

const PRIORITY: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-sky-50 text-sky-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-rose-50 text-rose-700",
};
const SEVERITY: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-rose-50 text-rose-700",
};
const RISK: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-rose-50 text-rose-700",
};
const KIND_LABEL: Record<string, string> = {
  cross_sell: "Cross-sell",
  renewal_risk: "Renewal risk",
  follow_up: "Follow-up",
};

function pill(value: string, map: Record<string, string>) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[value] ?? "bg-gray-100 text-gray-500"}`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function VoipIntelligencePanel({
  insights,
  flags,
  digests,
  contacts,
}: {
  insights: InsightDTO[];
  flags: FlagDTO[];
  digests: DigestDTO[];
  contacts: RecentContact[];
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  // Risk radar — computed on demand, held in component state.
  const [radar, setRadar] = useState<RiskAssessment[] | null>(null);
  const [radarLoading, setRadarLoading] = useState(false);

  // Caller brief — computed on demand for a picked contact.
  const [briefContactId, setBriefContactId] = useState("");
  const [brief, setBrief] = useState<CallerBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  function briefRun(): void {
    if (!briefContactId) return;
    setStatus(null);
    setBrief(null);
    setBriefLoading(true);
    void callerBrief(briefContactId)
      .then((b) => {
        if (b) setBrief(b);
        else setStatus("No call history for that contact.");
      })
      .catch(() => setStatus("Caller brief failed."))
      .finally(() => setBriefLoading(false));
  }

  function scan(): void {
    setStatus(null);
    startTransition(async () => {
      const r = await scanCalls();
      setStatus(r.message);
    });
  }

  function digest(): void {
    setStatus(null);
    startTransition(async () => {
      const r = await generateDigest();
      setStatus(r.message);
    });
  }

  function radarRun(): void {
    setStatus(null);
    setRadarLoading(true);
    void runRiskRadar()
      .then((r) => setRadar(r))
      .catch(() => setStatus("Risk radar failed."))
      .finally(() => setRadarLoading(false));
  }

  function insightStatus(
    id: string,
    next: "open" | "actioned" | "dismissed",
  ): void {
    startTransition(async () => {
      await updateInsight(id, next);
    });
  }

  function flagStatus(id: string, next: "open" | "resolved"): void {
    startTransition(async () => {
      await resolveFlag(id, next);
    });
  }

  const openInsights = insights.filter((i) => i.status === "open");
  const openFlags = flags.filter((f) => f.status === "open");
  const latest = digests[0];

  return (
    <div className="mt-6 space-y-8">
      {status ? (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          {status}
        </p>
      ) : null}

      {/* ── Caller brief ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Caller brief
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Pre-call prep for a client — their call pattern, last interaction,
          sentiment, and talking points.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={briefContactId}
            onChange={(e) => setBriefContactId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Select a client…</option>
            {contacts.map((c) => (
              <option key={c.contactId} value={c.contactId}>
                {c.contactName} (last call {c.lastCall})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={briefRun}
            disabled={briefLoading || !briefContactId}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {briefLoading ? "Building…" : "Generate brief"}
          </button>
        </div>
        {contacts.length === 0 ? (
          <p className="mt-2 text-xs text-gray-400">
            No matched callers in the last 90 days yet.
          </p>
        ) : null}
        {brief ? (
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{brief.contactName}</span>
              {brief.sentiment ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    brief.sentiment === "positive"
                      ? "bg-green-50 text-green-700"
                      : brief.sentiment === "needs-attention"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {brief.sentiment}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-gray-600">{brief.callPattern}</p>
            <p className="mt-0.5 text-sm text-gray-600">
              {brief.lastInteraction}
            </p>
            {brief.talkingPoints.length > 0 ? (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Talking points
                </p>
                <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
                  {brief.talkingPoints.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {brief.recentCalls.length > 0 ? (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Recent calls
                </p>
                <ul className="mt-1 space-y-0.5 text-sm text-gray-600">
                  {brief.recentCalls.map((c, idx) => (
                    <li key={idx}>
                      {c.date} · {c.direction} ·{" "}
                      {c.durationSeconds
                        ? `${Math.round(c.durationSeconds / 60)} min`
                        : "brief"}
                      {c.summary ? ` — ${c.summary.slice(0, 120)}` : ""}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ── Revenue insights ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Revenue insights
            <span className="ml-1.5 text-gray-400">({openInsights.length} open)</span>
          </h2>
          <button
            type="button"
            onClick={scan}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {pending ? "Working…" : "Scan calls"}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {insights.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
              No insights yet. Scan calls to surface cross-sell openings,
              renewal risk, and follow-ups.
            </p>
          ) : (
            insights.map((i) => (
              <div
                key={i.id}
                className={`rounded-xl border bg-white p-4 ${
                  i.status === "open"
                    ? "border-gray-200"
                    : "border-gray-100 opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {pill(i.priority, PRIORITY)}
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {KIND_LABEL[i.kind] ?? i.kind}
                  </span>
                  <span className="font-medium">{i.title}</span>
                  {i.status !== "open" ? (
                    <span className="text-xs text-gray-400">· {i.status}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-gray-600">{i.detail}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {[
                    i.contactName,
                    i.estimatedValue,
                    i.productType,
                    i.dueDate ? `due ${i.dueDate}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {i.status === "open" ? (
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => insightStatus(i.id, "actioned")}
                      disabled={pending}
                      className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50"
                    >
                      Mark actioned
                    </button>
                    <button
                      type="button"
                      onClick={() => insightStatus(i.id, "dismissed")}
                      disabled={pending}
                      className="text-xs font-semibold text-gray-400 hover:text-rose-600 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => insightStatus(i.id, "open")}
                    disabled={pending}
                    className="mt-2 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    Reopen
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Compliance flags ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Compliance flags
          <span className="ml-1.5 text-gray-400">({openFlags.length} open)</span>
        </h2>
        <div className="mt-3 space-y-2">
          {flags.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
              No compliance flags. The watchdog runs as part of a call scan.
            </p>
          ) : (
            flags.map((f) => (
              <div
                key={f.id}
                className={`rounded-xl border bg-white p-4 ${
                  f.status === "open"
                    ? "border-gray-200"
                    : "border-gray-100 opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {pill(f.severity, SEVERITY)}
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    {f.category.replace(/_/g, " ")}
                  </span>
                  <span className="font-medium">{f.title}</span>
                  {f.status !== "open" ? (
                    <span className="text-xs text-gray-400">· resolved</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-gray-600">{f.detail}</p>
                {f.regulation ? (
                  <p className="mt-1 text-xs text-gray-400">{f.regulation}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    flagStatus(f.id, f.status === "open" ? "resolved" : "open")
                  }
                  disabled={pending}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                >
                  {f.status === "open" ? "Mark resolved" : "Reopen"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Client risk radar ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Client risk radar
          </h2>
          <button
            type="button"
            onClick={radarRun}
            disabled={radarLoading}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {radarLoading ? "Scanning…" : radar ? "Re-run radar" : "Run radar"}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {radar === null ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
              Run the radar to score clients by call-pattern risk — frequency,
              missed calls, and recent-call sentiment.
            </p>
          ) : radar.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
              No at-risk clients — call patterns look healthy.
            </p>
          ) : (
            radar.map((a) => (
              <div
                key={a.contactId}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {pill(a.riskLevel, RISK)}
                  <span className="font-medium">{a.contactName}</span>
                  <span className="text-xs text-gray-400">
                    risk {a.riskScore}/100
                    {a.sentiment ? ` · ${a.sentiment}` : ""}
                  </span>
                </div>
                <ul className="mt-1.5 list-inside list-disc text-sm text-gray-600">
                  {a.factors.map((f, idx) => (
                    <li key={idx}>{f}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-sm font-medium text-indigo-700">
                  {a.recommendedAction}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Weekly digest ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Weekly digest
          </h2>
          <button
            type="button"
            onClick={digest}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {pending ? "Working…" : "Generate digest"}
          </button>
        </div>
        {!latest ? (
          <p className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
            No digests yet. Generate one to summarise the past week of calls.
          </p>
        ) : (
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {latest.data.weekStart} – {latest.data.weekEnd}
            </p>
            <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <span>
                <strong>{latest.data.totalCalls}</strong> calls (
                {latest.data.inbound} in / {latest.data.outbound} out)
              </span>
              <span>
                Answer rate <strong>{latest.data.answerRate ?? "—"}%</strong>
              </span>
              <span>
                <strong>{latest.data.missed}</strong> missed
              </span>
              <span>
                Busiest: {latest.data.busiestDay ?? "—"}
                {latest.data.busiestHour ? `, ${latest.data.busiestHour}` : ""}
              </span>
            </div>
            <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
              {latest.insights.headlines.map((h, idx) => (
                <li key={idx}>{h}</li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div>
                <dt className="inline font-semibold text-gray-500">
                  Coaching:{" "}
                </dt>
                <dd className="inline text-gray-700">
                  {latest.insights.coaching}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-gray-500">
                  Staffing:{" "}
                </dt>
                <dd className="inline text-gray-700">
                  {latest.insights.staffing}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-gray-500">
                  Week over week:{" "}
                </dt>
                <dd className="inline text-gray-700">
                  {latest.insights.weekComparison}
                </dd>
              </div>
            </dl>
          </div>
        )}
        {digests.length > 1 ? (
          <div className="mt-2 space-y-1">
            {digests.slice(1).map((d) => (
              <p key={d.id} className="text-xs text-gray-400">
                {d.periodStart} – {d.periodEnd}: {d.data.totalCalls} calls,{" "}
                {d.data.answerRate ?? "—"}% answered ·{" "}
                {fmtDate(d.createdAt)}
              </p>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
