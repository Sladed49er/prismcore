"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createCommissionSplit } from "@/lib/commission-splits";

export async function newCommissionSplit(input: {
  commissionId: string;
  producerId: string;
  sharePercent: string;
  amountDollars: string;
}): Promise<void> {
  if (!input.commissionId || !input.producerId) return;
  const tenant = await getCurrentTenant();
  await createCommissionSplit({
    tenantId: tenant.id,
    commissionId: input.commissionId,
    producerId: input.producerId,
    sharePercent: input.sharePercent.trim(),
    amountCents: Math.round(
      (Number.parseFloat(input.amountDollars) || 0) * 100,
    ),
  });
  revalidatePath("/m/commissions/splits");
}
