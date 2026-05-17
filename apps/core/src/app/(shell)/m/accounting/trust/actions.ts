"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createTrustEntry,
  updateTrustEntry,
  deleteTrustEntry,
  type TrustEntryType,
} from "@/lib/trust";

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

export async function editTrustEntry(input: {
  id: string;
  entryType: TrustEntryType;
  amountDollars: string;
  description: string;
  party: string;
  state: string;
  entryDate: string;
}): Promise<void> {
  if (!input.id) return;
  const amountCents = Math.round(
    (Number.parseFloat(input.amountDollars) || 0) * 100,
  );
  if (amountCents <= 0) return;
  const tenant = await getCurrentTenant();
  await updateTrustEntry({
    tenantId: tenant.id,
    id: input.id,
    entryType: input.entryType,
    amountCents,
    description: input.description.trim(),
    party: input.party.trim(),
    state: input.state.trim(),
    entryDate: input.entryDate || null,
  });
  revalidatePath("/m/accounting/trust");
}

export async function removeTrustEntry(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deleteTrustEntry(tenant.id, id);
  revalidatePath("/m/accounting/trust");
}
