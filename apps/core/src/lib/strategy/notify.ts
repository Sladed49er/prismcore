import { eq } from "drizzle-orm";
import { adminDb, users } from "@prismcore/db";
import type { RaisedAlert } from "@/lib/strategy/engine";

/**
 * Alert email delivery.
 *
 * In-app, an alert IS its `tenant_rule_alerts` row — it shows on the Strategy
 * Monitor the moment it is raised. This adds the outbound channel: when the
 * monitoring cron raises new alerts it emails the tenant's team.
 *
 * Email is sent through Resend's REST API and only activates once
 * `RESEND_API_KEY` is set — until then it no-ops cleanly, so the monitoring
 * loop and in-app alerts work regardless.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const SEVERITY_WORD: Record<string, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

function buildHtml(tenantName: string, alerts: RaisedAlert[]): string {
  const items = alerts
    .map(
      (a) =>
        `<li style="margin:0 0 8px"><strong>${
          SEVERITY_WORD[a.severity] ?? a.severity
        }</strong> — ${escapeHtml(a.message)}</li>`,
    )
    .join("");
  return `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#111">
  <h2 style="font-size:16px">Strategy alerts — ${escapeHtml(tenantName)}</h2>
  <p style="color:#444">${alerts.length} rule${
    alerts.length === 1 ? "" : "s"
  } fired in your Prism Core workspace:</p>
  <ul style="padding-left:18px">${items}</ul>
  <p style="color:#888;font-size:12px">Open Strategy Monitor in Prism Core to review and acknowledge.</p>
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Email a tenant's team about newly-raised alerts. No-ops without a key. */
export async function sendAlertEmails(
  tenantId: string,
  tenantName: string,
  alerts: RaisedAlert[],
): Promise<{ sent: boolean; reason?: string }> {
  if (alerts.length === 0) return { sent: false, reason: "no alerts" };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY not set" };

  const from =
    process.env.STRATEGY_ALERT_FROM || "Prism Core <support@prismams.com>";
  const replyTo = process.env.STRATEGY_ALERT_REPLY_TO || "matt@prismams.com";

  // The cron is a platform worker — adminDb to read the tenant's users.
  const rows = await adminDb()
    .select({ email: users.email })
    .from(users)
    .where(eq(users.tenantId, tenantId));
  const to = [...new Set(rows.map((r) => r.email).filter(Boolean))];
  if (to.length === 0) return { sent: false, reason: "no recipients" };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: replyTo,
        subject: `${alerts.length} strategy alert${
          alerts.length === 1 ? "" : "s"
        } — ${tenantName}`,
        html: buildHtml(tenantName, alerts),
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      console.error(`[strategy] alert email failed (${res.status}): ${body}`);
      return { sent: false, reason: `resend ${res.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error("[strategy] alert email error:", error);
    return { sent: false, reason: "send failed" };
  }
}
