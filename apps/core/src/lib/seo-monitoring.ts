import { desc, eq, and } from "drizzle-orm";
import { adminDb, seoMonitors, type SeoMonitor } from "@prismcore/db";
import { runDeepSiteAudit } from "@/lib/seo-site-audit";
import { validateAuditUrl } from "@/lib/seo-audit";
import { saveSiteAudit } from "@/lib/seo-audit-store";

/**
 * PrismOptimize weekly monitoring.
 *
 * Members register sites; a daily cron re-audits every site whose last run
 * is older than ~a week and emails the report. Daily-with-a-weekly-gate
 * (rather than a weekly cron) means a sweep cut short by the time budget
 * catches up the next day instead of the next week.
 *
 * Email goes out via Resend (`PRISMOPTIMIZE_RESEND_KEY`) from the account's
 * verified domain.
 */

const FROM = "PrismOptimize <prismoptimize@everysolutionit.com>";
const REPLY_TO = "matt@prismams.com";
const TOOL_URL = "https://core.prismams.com/prismseo";
const WEEK_MS = 6.5 * 24 * 60 * 60 * 1000;
const SWEEP_BUDGET_MS = 240_000;

export type { SeoMonitor };

export async function listMonitors(clerkUserId: string): Promise<SeoMonitor[]> {
  return adminDb()
    .select()
    .from(seoMonitors)
    .where(eq(seoMonitors.clerkUserId, clerkUserId))
    .orderBy(desc(seoMonitors.createdAt));
}

export async function addMonitor(input: {
  clerkUserId: string;
  email: string;
  siteUrl: string;
}): Promise<void> {
  const origin = validateAuditUrl(input.siteUrl).origin;
  await adminDb()
    .insert(seoMonitors)
    .values({
      clerkUserId: input.clerkUserId,
      email: input.email,
      siteUrl: origin,
    })
    .onConflictDoNothing();
}

export async function removeMonitor(
  clerkUserId: string,
  id: string,
): Promise<void> {
  await adminDb()
    .delete(seoMonitors)
    .where(
      and(eq(seoMonitors.id, id), eq(seoMonitors.clerkUserId, clerkUserId)),
    );
}

/* ── The sweep ────────────────────────────────────────────────────── */

export interface SweepResult {
  due: number;
  audited: number;
  emailed: number;
  errors: string[];
}

export async function runMonitorSweep(): Promise<SweepResult> {
  const started = Date.now();
  const cutoff = new Date(Date.now() - WEEK_MS);
  const all = await adminDb()
    .select()
    .from(seoMonitors)
    .orderBy(seoMonitors.lastRunAt);
  const due = all.filter((m) => !m.lastRunAt || m.lastRunAt < cutoff);

  const result: SweepResult = {
    due: due.length,
    audited: 0,
    emailed: 0,
    errors: [],
  };

  for (const monitor of due) {
    // A cut-short sweep resumes tomorrow — oldest lastRunAt goes first.
    if (Date.now() - started > SWEEP_BUDGET_MS) break;
    try {
      // The cron runs several sites inside one maxDuration=300 invocation —
      // keep each audit on the old tight budget rather than the uncapped
      // interactive default.
      const report = await runDeepSiteAudit(monitor.siteUrl, {
        timeBudgetMs: 210_000,
        maxPages: 75,
      });
      if (report.error) throw new Error(report.error);
      result.audited++;
      // The weekly crawl lands in the member's saved reports too, so the
      // email's "open the full report" link has something to open.
      await saveSiteAudit(monitor.clerkUserId, report);

      await sendReportEmail(monitor, report.score, {
        summary: report.summary,
        actions: report.actions.slice(0, 3).map((a) => a.title),
        pagesCrawled: report.pagesCrawled,
        brokenLinks: report.brokenLinks.length,
        imagesMissingAlt: report.stats.imagesMissingAlt,
        missingMeta: report.stats.missingMeta,
      });
      result.emailed++;

      await adminDb()
        .update(seoMonitors)
        .set({ lastScore: report.score, lastRunAt: new Date() })
        .where(eq(seoMonitors.id, monitor.id));
    } catch (error) {
      result.errors.push(
        `${monitor.siteUrl}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  return result;
}

async function sendReportEmail(
  monitor: SeoMonitor,
  score: number,
  detail: {
    summary: string;
    actions: string[];
    pagesCrawled: number;
    brokenLinks: number;
    imagesMissingAlt: number;
    missingMeta: number;
  },
): Promise<void> {
  const key = process.env.PRISMOPTIMIZE_RESEND_KEY;
  if (!key) throw new Error("PRISMOPTIMIZE_RESEND_KEY is not set.");

  const host = new URL(monitor.siteUrl).hostname;
  const delta =
    monitor.lastScore === null
      ? ""
      : score >= monitor.lastScore
        ? ` (up from ${monitor.lastScore})`
        : ` (down from ${monitor.lastScore})`;
  const color = score >= 80 ? "#059669" : score >= 55 ? "#d97706" : "#dc2626";

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <p style="color:#4f46e5;font-weight:600;text-transform:uppercase;font-size:12px;letter-spacing:.05em">PrismOptimize weekly report</p>
  <h1 style="font-size:20px;margin:4px 0 16px">${host}</h1>
  <div style="font-size:44px;font-weight:700;color:${color}">${score}<span style="font-size:16px;color:#6b7280">/100${delta}</span></div>
  ${detail.summary ? `<p style="font-size:14px;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px">${escapeHtml(detail.summary)}</p>` : ""}
  ${
    detail.actions.length
      ? `<p style="font-size:13px;font-weight:600;margin-bottom:4px">Top priorities</p>
  <ol style="font-size:13px;color:#374151;padding-left:20px;margin-top:0">${detail.actions.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ol>`
      : ""
  }
  <p style="font-size:12px;color:#6b7280">${detail.pagesCrawled} pages checked · ${detail.brokenLinks} broken links · ${detail.missingMeta} pages missing meta descriptions · ${detail.imagesMissingAlt} images without alt text</p>
  <a href="${TOOL_URL}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 16px;border-radius:8px">Open the full report</a>
  <p style="font-size:11px;color:#9ca3af;margin-top:24px">You get this because ${host} is monitored in PrismOptimize. Remove it any time from the tool.</p>
</div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [monitor.email],
      reply_to: REPLY_TO,
      subject: `${host} SEO score: ${score}/100${delta}`,
      html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the email (${response.status}).`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
