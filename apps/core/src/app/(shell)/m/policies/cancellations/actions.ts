"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCancellation,
  setCancellationStatus,
  type CancellationType,
  type CancellationStatus,
} from "@/lib/cancellations";

export async function newCancellation(input: {
  policyId: string;
  requestDate: string;
  effectiveDate: string;
  reason: string;
  cancellationType: CancellationType;
  returnPremiumDollars: string;
}): Promise<void> {
  if (!input.policyId) return;
  const tenant = await getCurrentTenant();
  await createCancellation({
    tenantId: tenant.id,
    policyId: input.policyId,
    requestDate: input.requestDate || null,
    effectiveDate: input.effectiveDate || null,
    reason: input.reason.trim(),
    cancellationType: input.cancellationType,
    returnPremiumCents: Math.round(
      (Number.parseFloat(input.returnPremiumDollars) || 0) * 100,
    ),
  });
  revalidatePath("/m/policies/cancellations");
}

export async function updateCancellationStatus(input: {
  id: string;
  status: CancellationStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setCancellationStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/policies/cancellations");
}
