import { eq } from "drizzle-orm";
import { withTenantContext, tenantBilling, type TenantBilling } from "@prismcore/db";
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
  suspendedAt: Date | null;
}>;

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

/**
 * The tenant's Stripe customer id, creating the customer on first need. The
 * customer carries `tenantId` in metadata so webhook events map straight back.
 */
export async function ensureStripeCustomer(
  tenantId: string,
  tenantName: string,
): Promise<string> {
  const existing = await getBilling(tenantId);
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe().customers.create({
    name: tenantName,
    metadata: { tenantId },
  });
  await upsertBilling(tenantId, { stripeCustomerId: customer.id });
  return customer.id;
}
