"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createClaim, setClaimStatus, type ClaimStatus } from "@/lib/claims";

export async function addClaim(input: {
  policyId: string;
  claimNumber: string;
  dateOfLoss: string;
  description: string;
  status: ClaimStatus;
  reserveDollars: string;
}): Promise<void> {
  if (!input.policyId || !input.claimNumber.trim()) return;
  const tenant = await getCurrentTenant();
  await createClaim({
    tenantId: tenant.id,
    policyId: input.policyId,
    claimNumber: input.claimNumber.trim(),
    dateOfLoss: input.dateOfLoss || null,
    description: input.description.trim(),
    status: input.status,
    reserveCents: Math.round(
      (Number.parseFloat(input.reserveDollars) || 0) * 100,
    ),
  });
  revalidatePath("/m/claims");
}

export async function advanceClaim(
  claimId: string,
  status: ClaimStatus,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setClaimStatus(tenant.id, claimId, status);
  revalidatePath("/m/claims");
}
