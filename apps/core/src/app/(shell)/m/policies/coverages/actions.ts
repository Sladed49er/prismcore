"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createCoverage } from "@/lib/coverages";

export async function newCoverage(input: {
  policyId: string;
  coverageType: string;
  limitText: string;
  deductibleDollars: string;
  premiumDollars: string;
  notes: string;
}): Promise<void> {
  if (!input.policyId || !input.coverageType.trim()) return;
  const tenant = await getCurrentTenant();
  const dollars = (v: string): number =>
    Math.round((Number.parseFloat(v) || 0) * 100);
  await createCoverage({
    tenantId: tenant.id,
    policyId: input.policyId,
    coverageType: input.coverageType.trim(),
    limitText: input.limitText.trim(),
    deductibleCents: dollars(input.deductibleDollars),
    premiumCents: dollars(input.premiumDollars),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/policies/coverages");
}
