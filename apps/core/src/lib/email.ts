/**
 * Generic transactional email — a thin wrapper over Resend's REST API.
 *
 * The Strategy Monitor has its own alert mailer (`lib/strategy/notify.ts`);
 * this is the shared sender for everything else (billing dunning, etc.). It
 * no-ops cleanly when `RESEND_API_KEY` is unset so non-email flows still work.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const DEFAULT_FROM = "Prism Core <support@prismams.com>";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
};

export type SendEmailResult = { sent: boolean; reason?: string };

/** Send one email through Resend. Returns `{ sent:false }` (never throws). */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY not set" };

  const to = Array.isArray(input.to) ? input.to : [input.to];
  if (to.length === 0) return { sent: false, reason: "no recipients" };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from || process.env.STRATEGY_ALERT_FROM || DEFAULT_FROM,
        to,
        reply_to: input.replyTo || "matt@prismams.com",
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      console.error(`[email] send failed (${res.status}): ${body}`);
      return { sent: false, reason: `resend ${res.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error("[email] send error:", error);
    return { sent: false, reason: "send failed" };
  }
}

/** Escape user/tenant text before interpolating it into an HTML email body. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
