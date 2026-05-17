"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createRenewalOffer,
  setRenewalOfferStatus,
  type RenewalOfferStatus,
} from "@/lib/renewal-offers";

export async function newRenewalOffer(input: {
  renewalId: string;
  carrierName: string;
  offerDate: string;
  premiumDollars: string;
  priorPremiumDollars: string;
  termSummary: string;
  expiresDate: string;
}): Promise<void> {
  if (!input.renewalId) return;
  const tenant = await getCurrentTenant();
  const dollars = (v: string): number =>
    Math.round((Number.parseFloat(v) || 0) * 100);
  await createRenewalOffer({
    tenantId: tenant.id,
    renewalId: input.renewalId,
    carrierName: input.carrierName.trim(),
    offerDate: input.offerDate || null,
    premiumCents: dollars(input.premiumDollars),
    priorPremiumCents: dollars(input.priorPremiumDollars),
    termSummary: input.termSummary.trim(),
    expiresDate: input.expiresDate || null,
  });
  revalidatePath("/m/renewals/offers");
}

export async function updateOfferStatus(input: {
  id: string;
  status: RenewalOfferStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setRenewalOfferStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/renewals/offers");
}
