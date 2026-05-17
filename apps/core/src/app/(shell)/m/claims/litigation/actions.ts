"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createClaimLitigation,
  setLitigationStatus,
  type LitigationStatus,
} from "@/lib/claim-litigation";

export async function newClaimLitigation(input: {
  claimId: string;
  caseCaption: string;
  court: string;
  docketNumber: string;
  defenseAttorney: string;
  filedDate: string;
  trialDate: string;
}): Promise<void> {
  if (!input.claimId || !input.caseCaption.trim()) return;
  const tenant = await getCurrentTenant();
  await createClaimLitigation({
    tenantId: tenant.id,
    claimId: input.claimId,
    caseCaption: input.caseCaption.trim(),
    court: input.court.trim(),
    docketNumber: input.docketNumber.trim(),
    defenseAttorney: input.defenseAttorney.trim(),
    filedDate: input.filedDate || null,
    trialDate: input.trialDate || null,
  });
  revalidatePath("/m/claims/litigation");
}

export async function updateLitigationStatus(input: {
  id: string;
  status: LitigationStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setLitigationStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/claims/litigation");
}
