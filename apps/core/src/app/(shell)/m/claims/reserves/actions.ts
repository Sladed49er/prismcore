"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createReserveEntry,
  type ReserveType,
} from "@/lib/claim-reserves";

export async function newReserveEntry(input: {
  claimId: string;
  entryDate: string;
  reserveType: ReserveType;
  changeDollars: string;
  reason: string;
}): Promise<void> {
  if (!input.claimId) return;
  const tenant = await getCurrentTenant();
  await createReserveEntry({
    tenantId: tenant.id,
    claimId: input.claimId,
    entryDate: input.entryDate || null,
    reserveType: input.reserveType,
    changeCents: Math.round(
      (Number.parseFloat(input.changeDollars) || 0) * 100,
    ),
    reason: input.reason.trim(),
  });
  revalidatePath("/m/claims/reserves");
}
