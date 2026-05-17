"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createTrustEntry, type TrustEntryType } from "@/lib/trust";

export async function addTrustEntry(input: {
  entryType: TrustEntryType;
  amountDollars: string;
  description: string;
  party: string;
  state: string;
  entryDate: string;
}): Promise<void> {
  const amountCents = Math.round(
    (Number.parseFloat(input.amountDollars) || 0) * 100,
  );
  if (amountCents <= 0) return;
  const tenant = await getCurrentTenant();
  await createTrustEntry({
    tenantId: tenant.id,
    entryType: input.entryType,
    amountCents,
    description: input.description.trim(),
    party: input.party.trim(),
    state: input.state.trim(),
    entryDate: input.entryDate || null,
  });
  revalidatePath("/m/accounting/trust");
}
