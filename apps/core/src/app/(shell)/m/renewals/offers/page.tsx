import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listRenewalOffers } from "@/lib/renewal-offers";
import { listRenewals } from "@/lib/renewals";
import {
  RenewalOffersPanel,
  type RenewalOfferDTO,
  type RenewalOption,
} from "@/components/renewal-offers-panel";

export default async function RenewalOffersPage() {
  await requireModule("renewals");
  const { config } = await loadCurrentTenant();
  const [offerRows, renewalRows] = await Promise.all([
    listRenewalOffers(config.id),
    listRenewals(config.id),
  ]);

  const offers: RenewalOfferDTO[] = offerRows.map((o) => ({
    id: o.id,
    policyNumber: o.policyNumber,
    clientName: o.clientName,
    carrierName: o.carrierName,
    offerDate: o.offerDate,
    premiumCents: o.premiumCents,
    priorPremiumCents: o.priorPremiumCents,
    changeCents: o.changeCents,
    expiresDate: o.expiresDate,
    status: o.status,
  }));
  const renewals: RenewalOption[] = renewalRows.map((r) => ({
    id: r.id,
    label: `${r.policyNumber} — ${r.clientName}`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/renewals"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Renewals
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Renewal Offers</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The renewal terms presented to each insured — premium, the change from
        the expiring term, and where the offer stands.
      </p>
      <RenewalOffersPanel offers={offers} renewals={renewals} />
    </div>
  );
}
