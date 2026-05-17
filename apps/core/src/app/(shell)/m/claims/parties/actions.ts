"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createClaimParty,
  type ClaimPartyRole,
} from "@/lib/claim-parties";

export async function newClaimParty(input: {
  claimId: string;
  role: ClaimPartyRole;
  name: string;
  organization: string;
  phone: string;
  email: string;
  notes: string;
}): Promise<void> {
  if (!input.claimId || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createClaimParty({
    tenantId: tenant.id,
    claimId: input.claimId,
    role: input.role,
    name: input.name.trim(),
    organization: input.organization.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/claims/parties");
}
