"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createInstallment,
  markInstallmentPaid,
} from "@/lib/installments";

export async function newInstallment(input: {
  policyId: string;
  installmentNumber: string;
  dueDate: string;
  amountDollars: string;
}): Promise<void> {
  if (!input.policyId) return;
  const tenant = await getCurrentTenant();
  await createInstallment({
    tenantId: tenant.id,
    policyId: input.policyId,
    installmentNumber: Math.max(
      1,
      Math.round(Number.parseFloat(input.installmentNumber) || 1),
    ),
    dueDate: input.dueDate || null,
    amountCents: Math.round(
      (Number.parseFloat(input.amountDollars) || 0) * 100,
    ),
  });
  revalidatePath("/m/policies/installments");
}

export async function payInstallment(input: {
  id: string;
  paidDollars: string;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await markInstallmentPaid({
    tenantId: tenant.id,
    id: input.id,
    paidCents: Math.round((Number.parseFloat(input.paidDollars) || 0) * 100),
  });
  revalidatePath("/m/policies/installments");
}
