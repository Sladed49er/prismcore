"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createClaimRecovery,
  setClaimRecoveryStatus,
  type RecoveryType,
  type RecoveryStatus,
} from "@/lib/claim-recoveries";

export async function newClaimRecovery(input: {
  claimId: string;
  recoveryType: RecoveryType;
  description: string;
  expectedDollars: string;
  recoveredDollars: string;
  recoveryDate: string;
}): Promise<void> {
  if (!input.claimId) return;
  const tenant = await getCurrentTenant();
  const dollars = (v: string): number =>
    Math.round((Number.parseFloat(v) || 0) * 100);
  await createClaimRecovery({
    tenantId: tenant.id,
    claimId: input.claimId,
    recoveryType: input.recoveryType,
    description: input.description.trim(),
    expectedCents: dollars(input.expectedDollars),
    recoveredCents: dollars(input.recoveredDollars),
    recoveryDate: input.recoveryDate || null,
  });
  revalidatePath("/m/claims/recoveries");
}

export async function updateClaimRecoveryStatus(input: {
  id: string;
  status: RecoveryStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setClaimRecoveryStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/claims/recoveries");
}
