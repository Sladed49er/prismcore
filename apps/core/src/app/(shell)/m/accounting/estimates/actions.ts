"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createEstimate,
  setEstimateStatus,
  type EstimateStatus,
} from "@/lib/estimates";

export async function addEstimate(input: {
  clientId: string;
  estimateNumber: string;
  description: string;
  amountDollars: string;
  status: EstimateStatus;
  validUntil: string;
}): Promise<void> {
  if (!input.clientId || !input.estimateNumber.trim()) return;
  const tenant = await getCurrentTenant();
  await createEstimate({
    tenantId: tenant.id,
    clientId: input.clientId,
    estimateNumber: input.estimateNumber.trim(),
    description: input.description.trim(),
    amountCents: Math.round(
      (Number.parseFloat(input.amountDollars) || 0) * 100,
    ),
    status: input.status,
    validUntil: input.validUntil || null,
  });
  revalidatePath("/m/accounting/estimates");
}

export async function advanceEstimate(
  estimateId: string,
  status: EstimateStatus,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setEstimateStatus(tenant.id, estimateId, status);
  revalidatePath("/m/accounting/estimates");
}
