"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createProducerPayout,
  markPayoutPaid,
} from "@/lib/producer-payouts";

export async function newProducerPayout(input: {
  producerId: string;
  payoutDate: string;
  periodLabel: string;
  amountDollars: string;
  method: string;
}): Promise<void> {
  if (!input.producerId) return;
  const tenant = await getCurrentTenant();
  await createProducerPayout({
    tenantId: tenant.id,
    producerId: input.producerId,
    payoutDate: input.payoutDate || null,
    periodLabel: input.periodLabel.trim(),
    amountCents: Math.round(
      (Number.parseFloat(input.amountDollars) || 0) * 100,
    ),
    method: input.method,
  });
  revalidatePath("/m/commissions/payouts");
}

export async function payProducerPayout(input: {
  id: string;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await markPayoutPaid({ tenantId: tenant.id, id: input.id });
  revalidatePath("/m/commissions/payouts");
}
