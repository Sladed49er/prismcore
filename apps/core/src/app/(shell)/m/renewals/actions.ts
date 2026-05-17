"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createRenewal,
  setRenewalStage,
  type RenewalStage,
} from "@/lib/renewals";

export async function addRenewal(input: {
  policyId: string;
  stage: RenewalStage;
  dueDate: string;
  notes: string;
}): Promise<void> {
  if (!input.policyId) return;
  const tenant = await getCurrentTenant();
  await createRenewal({
    tenantId: tenant.id,
    policyId: input.policyId,
    stage: input.stage,
    dueDate: input.dueDate || null,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/renewals");
}

export async function advanceStage(
  renewalId: string,
  stage: RenewalStage,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setRenewalStage(tenant.id, renewalId, stage);
  revalidatePath("/m/renewals");
}
