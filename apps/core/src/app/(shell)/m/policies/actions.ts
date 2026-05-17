"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createPolicy, type PolicyStatus } from "@/lib/policies";

export async function addPolicy(input: {
  clientId: string;
  policyNumber: string;
  lineOfBusiness: string;
  carrier: string;
  status: PolicyStatus;
  effectiveDate: string;
  expirationDate: string;
  premiumDollars: string;
  customValues: Record<string, string>;
}): Promise<void> {
  if (!input.clientId || !input.policyNumber.trim()) return;
  const tenant = await getCurrentTenant();
  const premiumCents = Math.round(
    (Number.parseFloat(input.premiumDollars) || 0) * 100,
  );
  await createPolicy({
    tenantId: tenant.id,
    clientId: input.clientId,
    policyNumber: input.policyNumber.trim(),
    lineOfBusiness: input.lineOfBusiness,
    carrier: input.carrier.trim(),
    status: input.status,
    effectiveDate: input.effectiveDate || null,
    expirationDate: input.expirationDate || null,
    premiumCents,
    customValues: input.customValues,
  });
  revalidatePath("/m/policies");
}
