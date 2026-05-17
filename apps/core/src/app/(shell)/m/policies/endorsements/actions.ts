"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createEndorsement,
  setEndorsementStatus,
  type EndorsementStatus,
} from "@/lib/endorsements";

export async function newEndorsement(input: {
  policyId: string;
  endorsementNumber: string;
  effectiveDate: string;
  description: string;
  premiumChangeDollars: string;
}): Promise<void> {
  if (!input.policyId || !input.endorsementNumber.trim()) return;
  const tenant = await getCurrentTenant();
  await createEndorsement({
    tenantId: tenant.id,
    policyId: input.policyId,
    endorsementNumber: input.endorsementNumber.trim(),
    effectiveDate: input.effectiveDate || null,
    description: input.description.trim(),
    premiumChangeCents: Math.round(
      (Number.parseFloat(input.premiumChangeDollars) || 0) * 100,
    ),
  });
  revalidatePath("/m/policies/endorsements");
}

export async function updateEndorsementStatus(input: {
  id: string;
  status: EndorsementStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setEndorsementStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/policies/endorsements");
}
