"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createSurplusLines,
  setSurplusLinesStatus,
  type SurplusLinesStatus,
} from "@/lib/surplus-lines";

export async function newSurplusLines(input: {
  policyReference: string;
  state: string;
  premiumDollars: string;
  taxRatePercent: string;
  stampingFeeDollars: string;
  filingFeeDollars: string;
  dueDate: string;
}): Promise<void> {
  if (!input.policyReference.trim()) return;
  const tenant = await getCurrentTenant();
  const dollars = (v: string): number =>
    Math.round((Number.parseFloat(v) || 0) * 100);
  await createSurplusLines({
    tenantId: tenant.id,
    policyReference: input.policyReference.trim(),
    state: input.state.trim(),
    premiumCents: dollars(input.premiumDollars),
    taxRatePercent: input.taxRatePercent.trim(),
    stampingFeeCents: dollars(input.stampingFeeDollars),
    filingFeeCents: dollars(input.filingFeeDollars),
    dueDate: input.dueDate || null,
  });
  revalidatePath("/m/accounting/surplus-lines");
}

export async function updateSurplusLinesStatus(input: {
  id: string;
  status: SurplusLinesStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setSurplusLinesStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/accounting/surplus-lines");
}
