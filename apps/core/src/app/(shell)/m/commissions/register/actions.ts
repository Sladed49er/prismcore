"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCommission,
  setCommissionStatus,
  type CommissionStatus,
} from "@/lib/commissions";

export async function addCommission(input: {
  policyId: string;
  amountDollars: string;
  ratePercent: string;
  status: CommissionStatus;
  receivedDate: string;
}): Promise<void> {
  if (!input.policyId) return;
  const tenant = await getCurrentTenant();
  await createCommission({
    tenantId: tenant.id,
    policyId: input.policyId,
    amountCents: Math.round(
      (Number.parseFloat(input.amountDollars) || 0) * 100,
    ),
    ratePercent: input.ratePercent.trim(),
    status: input.status,
    receivedDate: input.receivedDate || null,
  });
  revalidatePath("/m/commissions/register");
}

export async function advanceCommission(
  commissionId: string,
  status: CommissionStatus,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setCommissionStatus(tenant.id, commissionId, status);
  revalidatePath("/m/commissions/register");
}
