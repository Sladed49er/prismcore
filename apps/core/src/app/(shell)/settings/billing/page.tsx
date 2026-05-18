import { getCurrentTenant } from "@/lib/current-tenant";
import { getBilling } from "@/lib/billing";
import { BillingPanel, type BillingDTO } from "@/components/billing-panel";

/**
 * Billing — the tenant's Prism Core subscription. Subscribe via Stripe
 * Checkout, or manage an existing subscription through the Stripe portal.
 */
export default async function BillingPage() {
  const tenant = await getCurrentTenant();
  const billing = await getBilling(tenant.id);

  const dto: BillingDTO = {
    status: billing?.status ?? "none",
    currentPeriodEnd: billing?.currentPeriodEnd
      ? billing.currentPeriodEnd.toISOString()
      : null,
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="mt-1 text-sm text-gray-600">
        Your Prism Core subscription for {tenant.name}.
      </p>
      <BillingPanel billing={dto} />
    </div>
  );
}
