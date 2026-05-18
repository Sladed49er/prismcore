import { eq } from "drizzle-orm";
import {
  withTenantContext,
  adminDb,
  tenantBilling,
  tenants,
  type TenantBilling,
} from "@prismcore/db";
import { stripe } from "@/lib/stripe";

/**
 * Billing data layer — Prism Core's local mirror of each tenant's Stripe
 * subscription. The Stripe webhook is the source of truth for status; these
 * helpers read and write the `tenant_billing` row, all RLS-scoped.
 */

/** Fields the webhook / actions update on a tenant's billing row. */
export type BillingPatch = Partial<{
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: TenantBilling["status"];
  planKey: string | null;
  currentPeriodEnd: Date | null;
  pastDueSince: Date | null;
  dunningStage: number;
  suspendedAt: Date | null;
  customPriceCents: number | null;
  comp: boolean;
  billingNotes: string;
}>;

/**
 * The tenant a Stripe customer belongs to — for the webhook, which is
 * authenticated by Stripe's signature, not a tenant session, so it reads
 * through `adminDb` to map an incoming event back to its tenant.
 */
export async function findTenantByStripeCustomer(
  customerId: string,
): Promise<string | null> {
  const rows = await adminDb()
    .select({ tenantId: tenantBilling.tenantId })
    .from(tenantBilling)
    .where(eq(tenantBilling.stripeCustomerId, customerId));
  return rows[0]?.tenantId ?? null;
}

export async function getBilling(
  tenantId: string,
): Promise<TenantBilling | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(tenantBilling)
      .where(eq(tenantBilling.tenantId, tenantId));
    return row ?? null;
  });
}

/** Insert or update the tenant's billing row. */
export async function upsertBilling(
  tenantId: string,
  patch: BillingPatch,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .insert(tenantBilling)
      .values({ tenantId, ...patch })
      .onConflictDoUpdate({
        target: tenantBilling.tenantId,
        set: { ...patch, updatedAt: new Date() },
      });
  });
}

/** Whether a Stripe error means the referenced object does not exist. */
function isMissingResource(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "resource_missing"
  );
}

/**
 * The tenant's Stripe customer id, creating the customer on first need. The
 * customer carries `tenantId` in metadata so webhook events map straight back.
 *
 * A stored id is verified against the current Stripe account before it is
 * trusted: if it no longer exists — the Stripe account was switched, or the
 * customer was deleted — a fresh customer is created and the row updated. This
 * keeps billing self-healing across a Stripe account change.
 */
export async function ensureStripeCustomer(
  tenantId: string,
  tenantName: string,
): Promise<string> {
  const existing = await getBilling(tenantId);
  if (existing?.stripeCustomerId) {
    try {
      const customer = await stripe().customers.retrieve(
        existing.stripeCustomerId,
      );
      if (!("deleted" in customer)) return existing.stripeCustomerId;
    } catch (error) {
      if (!isMissingResource(error)) throw error;
      // resource_missing — the stored customer is gone; recreate below.
    }
  }

  const customer = await stripe().customers.create({
    name: tenantName,
    metadata: { tenantId },
  });
  await upsertBilling(tenantId, { stripeCustomerId: customer.id });
  return customer.id;
}

/** The base-plan recurring price, resolved by its stable lookup key — so the
 *  same code works against test and live (each has its own price id). */
export async function getBasePriceId(): Promise<string> {
  const prices = await stripe().prices.list({
    lookup_keys: ["prismcore_base_monthly"],
    limit: 1,
  });
  const id = prices.data[0]?.id;
  if (!id) throw new Error("Base plan price not found in Stripe");
  return id;
}

/**
 * Start a subscription checkout for the tenant; returns the URL.
 *
 * If a platform admin has set a custom monthly price for this tenant, the
 * checkout bills that negotiated amount via an inline `price_data` line item
 * instead of the standard base-plan price.
 */
export async function createCheckoutSession(input: {
  tenantId: string;
  tenantName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const customer = await ensureStripeCustomer(input.tenantId, input.tenantName);
  const billing = await getBilling(input.tenantId);

  const lineItem:
    | { price: string; quantity: number }
    | {
        price_data: {
          currency: string;
          unit_amount: number;
          recurring: { interval: "month" };
          product_data: { name: string };
        };
        quantity: number;
      } =
    billing?.customPriceCents != null
      ? {
          price_data: {
            currency: "usd",
            unit_amount: billing.customPriceCents,
            recurring: { interval: "month" },
            product_data: { name: "Prism Core — Base (custom rate)" },
          },
          quantity: 1,
        }
      : { price: await getBasePriceId(), quantity: 1 };

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [lineItem],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    subscription_data: { metadata: { tenantId: input.tenantId } },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/**
 * Per-tenant billing customization — read and written by a platform admin
 * through `adminDb` (cross-tenant), not a tenant session.
 */
export interface TenantBillingRow {
  tenantId: string;
  tenantName: string;
  status: TenantBilling["status"];
  customPriceCents: number | null;
  comp: boolean;
  billingNotes: string;
  currentPeriodEnd: Date | null;
}

/** Every tenant with its billing state — for the admin billing page. */
export async function listAllBilling(): Promise<TenantBillingRow[]> {
  const rows = await adminDb()
    .select({ tenant: tenants, billing: tenantBilling })
    .from(tenants)
    .leftJoin(tenantBilling, eq(tenantBilling.tenantId, tenants.id));
  return rows.map((r) => ({
    tenantId: r.tenant.id,
    tenantName: r.tenant.name,
    status: r.billing?.status ?? "none",
    customPriceCents: r.billing?.customPriceCents ?? null,
    comp: r.billing?.comp ?? false,
    billingNotes: r.billing?.billingNotes ?? "",
    currentPeriodEnd: r.billing?.currentPeriodEnd ?? null,
  }));
}

/** Set a tenant's billing overrides — platform admin, runs cross-tenant. */
export async function setBillingOverride(input: {
  tenantId: string;
  customPriceCents: number | null;
  comp: boolean;
  billingNotes: string;
}): Promise<void> {
  await adminDb()
    .insert(tenantBilling)
    .values({
      tenantId: input.tenantId,
      customPriceCents: input.customPriceCents,
      comp: input.comp,
      billingNotes: input.billingNotes,
    })
    .onConflictDoUpdate({
      target: tenantBilling.tenantId,
      set: {
        customPriceCents: input.customPriceCents,
        comp: input.comp,
        billingNotes: input.billingNotes,
        updatedAt: new Date(),
      },
    });
}

/** Open the Stripe customer portal (manage payment method, cancel). */
export async function createPortalSession(input: {
  tenantId: string;
  returnUrl: string;
}): Promise<string> {
  const billing = await getBilling(input.tenantId);
  if (!billing?.stripeCustomerId) {
    throw new Error("This workspace has no Stripe customer yet");
  }
  const session = await stripe().billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: input.returnUrl,
  });
  return session.url;
}
