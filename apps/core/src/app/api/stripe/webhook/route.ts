import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  findTenantByStripeCustomer,
  getBilling,
  upsertBilling,
  type BillingPatch,
} from "@/lib/billing";
import type { TenantBilling } from "@prismcore/db";

/** Reads the raw body for signature verification — never cache. */
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the source of truth for each tenant's subscription state.
 *
 * Stripe POSTs subscription and invoice events here; every event is verified
 * against `STRIPE_WEBHOOK_SECRET` (an unsigned request is rejected) and then
 * synced into `tenant_billing`. The dunning ladder reads what this writes.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json(
      { error: "signature verification failed" },
      { status: 400 },
    );
  }

  try {
    await handleEvent(event);
  } catch (error) {
    console.error(`[stripe webhook] ${event.type} failed:`, error);
    return NextResponse.json(
      { error: "webhook processing failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ received: true });
}

/** Map a Stripe subscription status to Prism Core's billing status. */
function mapStatus(s: Stripe.Subscription.Status): TenantBilling["status"] {
  switch (s) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

/** The current period end — newer Stripe carries it on the subscription item. */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items.data[0] as
    | { current_period_end?: number }
    | undefined;
  return item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;
}

function customerId(c: string | { id: string } | null): string | null {
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId =
        (sub.metadata?.tenantId as string | undefined) ??
        (await findTenantByStripeCustomer(customerId(sub.customer) ?? ""));
      if (!tenantId) return;

      const deleted = event.type === "customer.subscription.deleted";
      const status = deleted ? "canceled" : mapStatus(sub.status);
      const patch: BillingPatch = {
        stripeSubscriptionId: deleted ? null : sub.id,
        status,
        planKey: "base",
        currentPeriodEnd: periodEnd(sub),
      };
      if (status === "active" || status === "trialing") {
        patch.pastDueSince = null;
        patch.dunningStage = 0;
        patch.suspendedAt = null;
      }
      if (status === "past_due") {
        const existing = await getBilling(tenantId);
        // Keep the original clock — don't reset it on every event.
        patch.pastDueSince = existing?.pastDueSince ?? new Date();
      }
      await upsertBilling(tenantId, patch);
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const tenantId = await findTenantByStripeCustomer(
        customerId(inv.customer) ?? "",
      );
      if (!tenantId) return;
      const existing = await getBilling(tenantId);
      await upsertBilling(tenantId, {
        status: "past_due",
        pastDueSince: existing?.pastDueSince ?? new Date(),
      });
      break;
    }

    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      const tenantId = await findTenantByStripeCustomer(
        customerId(inv.customer) ?? "",
      );
      if (!tenantId) return;
      // Payment recovered — clear the dunning clock.
      await upsertBilling(tenantId, {
        status: "active",
        pastDueSince: null,
        dunningStage: 0,
        suspendedAt: null,
      });
      break;
    }

    default:
      // Unhandled event — acknowledge so Stripe doesn't retry.
      break;
  }
}
