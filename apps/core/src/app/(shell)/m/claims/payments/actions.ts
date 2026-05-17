"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createClaimPayment,
  setClaimPaymentStatus,
  type ClaimPaymentType,
  type ClaimPaymentStatus,
} from "@/lib/claim-payments";

export async function newClaimPayment(input: {
  claimId: string;
  paymentDate: string;
  payee: string;
  paymentType: ClaimPaymentType;
  amountDollars: string;
  checkNumber: string;
}): Promise<void> {
  if (!input.claimId || !input.payee.trim()) return;
  const tenant = await getCurrentTenant();
  await createClaimPayment({
    tenantId: tenant.id,
    claimId: input.claimId,
    paymentDate: input.paymentDate || null,
    payee: input.payee.trim(),
    paymentType: input.paymentType,
    amountCents: Math.round(
      (Number.parseFloat(input.amountDollars) || 0) * 100,
    ),
    checkNumber: input.checkNumber.trim(),
  });
  revalidatePath("/m/claims/payments");
}

export async function updateClaimPaymentStatus(input: {
  id: string;
  status: ClaimPaymentStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setClaimPaymentStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/claims/payments");
}
