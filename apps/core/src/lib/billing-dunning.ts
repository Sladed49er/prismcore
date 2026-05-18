/**
 * The dunning ladder — what Prism Core does when a tenant's payment fails.
 *
 * The Stripe webhook sets a tenant `past_due` and stamps `pastDueSince`. This
 * runs daily (see `app/api/cron/billing/route.ts`) and walks each past-due
 * tenant up a four-rung ladder, one rung per run:
 *
 *   stage 0 → 1  payment failed   — internal heads-up to billing@prismams.com
 *   stage 1 → 2  15 days past due — warning to billing@ + the tenant's team
 *   stage 2 → 3  30 days past due — SUSPEND the tenant + notify everyone
 *
 * `invoice.paid` resets status to `active` and the stage to 0, so a tenant
 * that pays mid-ladder drops off it. The suspension itself (status
 * `suspended`) is enforced at the shell by the login gate.
 */
import { and, eq } from "drizzle-orm";
import { adminDb, tenants, tenantBilling, users } from "@prismcore/db";
import { upsertBilling } from "@/lib/billing";
import { sendEmail, escapeHtml } from "@/lib/email";

/** Where internal billing alerts go. */
const INTERNAL_BILLING = "billing@prismams.com";
/** Days past due before the second-stage warning. */
const NOTICE_DAYS = 15;
/** Days past due before suspension. */
const SUSPEND_DAYS = 30;

const SUPPORT_LINE =
  "Questions? Reach us at billing@prismams.com — we're glad to help sort this out.";

export type DunningResult = {
  processed: number;
  alerted: number;
  noticed: number;
  suspended: number;
};

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/** Every user email for a tenant — the customer-facing recipients. */
async function tenantRecipients(tenantId: string): Promise<string[]> {
  const rows = await adminDb()
    .select({ email: users.email })
    .from(users)
    .where(eq(users.tenantId, tenantId));
  return [...new Set(rows.map((r) => r.email).filter(Boolean))];
}

function wrap(body: string): string {
  return `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5">${body}</div>`;
}

/**
 * Advance every past-due tenant one rung up the dunning ladder. Idempotent:
 * the stage counter on each row means a re-run never re-sends the same email.
 */
export async function runDunning(): Promise<DunningResult> {
  const result: DunningResult = {
    processed: 0,
    alerted: 0,
    noticed: 0,
    suspended: 0,
  };

  const rows = await adminDb()
    .select({
      tenantId: tenantBilling.tenantId,
      name: tenants.name,
      pastDueSince: tenantBilling.pastDueSince,
      dunningStage: tenantBilling.dunningStage,
    })
    .from(tenantBilling)
    .innerJoin(tenants, eq(tenantBilling.tenantId, tenants.id))
    // Comped accounts are never dunned, even if a stray past_due slips in.
    .where(
      and(
        eq(tenantBilling.status, "past_due"),
        eq(tenantBilling.comp, false),
      ),
    );

  for (const row of rows) {
    if (!row.pastDueSince) continue;
    result.processed++;
    const days = daysSince(row.pastDueSince);
    const name = escapeHtml(row.name);

    try {
      // Stage 0 → 1: payment just failed — internal heads-up only.
      if (row.dunningStage < 1) {
        await sendEmail({
          to: INTERNAL_BILLING,
          subject: `Payment failed — ${row.name}`,
          html: wrap(
            `<h2 style="font-size:16px">Payment failed</h2>
             <p><strong>${name}</strong>'s Prism Core subscription went past due.
             The dunning clock has started — a customer warning goes out at
             ${NOTICE_DAYS} days, suspension at ${SUSPEND_DAYS} days.</p>`,
          ),
        });
        await upsertBilling(row.tenantId, { dunningStage: 1 });
        result.alerted++;
        continue;
      }

      // Stage 1 → 2: 15 days past due — warn billing@ and the tenant's team.
      if (row.dunningStage < 2 && days >= NOTICE_DAYS) {
        const recipients = [
          INTERNAL_BILLING,
          ...(await tenantRecipients(row.tenantId)),
        ];
        await sendEmail({
          to: recipients,
          subject: `Action needed — your Prism Core payment is ${days} days overdue`,
          html: wrap(
            `<h2 style="font-size:16px">Your payment is overdue</h2>
             <p>We couldn't process payment for <strong>${name}</strong>'s
             Prism Core subscription, now ${days} days past due.</p>
             <p>Please update your payment method in <strong>Settings → Billing</strong>
             to avoid an interruption. Accounts that remain unpaid at
             ${SUSPEND_DAYS} days are suspended until payment is resolved.</p>
             <p style="color:#666;font-size:13px">${SUPPORT_LINE}</p>`,
          ),
        });
        await upsertBilling(row.tenantId, { dunningStage: 2 });
        result.noticed++;
        continue;
      }

      // Stage 2 → 3: 30 days past due — suspend and notify everyone.
      if (row.dunningStage < 3 && days >= SUSPEND_DAYS) {
        const recipients = [
          INTERNAL_BILLING,
          ...(await tenantRecipients(row.tenantId)),
        ];
        await sendEmail({
          to: recipients,
          subject: `Your Prism Core workspace has been suspended`,
          html: wrap(
            `<h2 style="font-size:16px">Workspace suspended</h2>
             <p><strong>${name}</strong>'s Prism Core workspace has been
             suspended after ${days} days without payment.</p>
             <p>Your data is safe. To restore access, update your payment
             method and settle the outstanding balance — the workspace
             reactivates automatically once payment clears.</p>
             <p style="color:#666;font-size:13px">${SUPPORT_LINE}</p>`,
          ),
        });
        await upsertBilling(row.tenantId, {
          status: "suspended",
          suspendedAt: new Date(),
          dunningStage: 3,
        });
        result.suspended++;
        continue;
      }
    } catch (error) {
      console.error(`[dunning] tenant ${row.tenantId} failed:`, error);
    }
  }

  return result;
}
