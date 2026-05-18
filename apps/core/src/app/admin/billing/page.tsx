import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAllBilling } from "@/lib/billing";
import {
  AdminBillingPanel,
  type AdminBillingDTO,
} from "@/components/admin-billing-panel";

/**
 * Platform-admin billing — per-tenant billing customization. Set a negotiated
 * custom monthly price, comp an account, or record special-conditions notes
 * for any tenant. Guarded by `requireAdmin`.
 */
export default async function AdminBillingPage() {
  await requireAdmin();
  const rows = await listAllBilling();

  const billing: AdminBillingDTO[] = rows.map((r) => ({
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    status: r.status,
    customPriceCents: r.customPriceCents,
    comp: r.comp,
    billingNotes: r.billingNotes,
  }));

  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            Platform Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Billing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Customize billing per client — a negotiated custom rate, a
            complimentary account, or special-conditions notes. Custom rates
            are billed at checkout via Stripe.
          </p>
        </div>
        <Link
          href="/admin"
          className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
        >
          ← Console
        </Link>
      </div>

      <AdminBillingPanel billing={billing} />
    </main>
  );
}
