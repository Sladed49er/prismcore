"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createRemarketingQuote,
  setRemarketingQuoteStatus,
  type RemarketingQuoteStatus,
} from "@/lib/remarketing";

export async function newRemarketingQuote(input: {
  renewalId: string;
  carrierName: string;
  quotedPremiumDollars: string;
  coverageSummary: string;
  notes: string;
}): Promise<void> {
  if (!input.renewalId || !input.carrierName.trim()) return;
  const tenant = await getCurrentTenant();
  await createRemarketingQuote({
    tenantId: tenant.id,
    renewalId: input.renewalId,
    carrierName: input.carrierName.trim(),
    quotedPremiumCents: Math.round(
      (Number.parseFloat(input.quotedPremiumDollars) || 0) * 100,
    ),
    coverageSummary: input.coverageSummary.trim(),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/renewals/remarketing");
}

export async function updateQuoteStatus(input: {
  id: string;
  status: RemarketingQuoteStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setRemarketingQuoteStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/renewals/remarketing");
}
