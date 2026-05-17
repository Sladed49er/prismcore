"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createRetentionRecord,
  type RetentionOutcome,
  type RetentionReason,
} from "@/lib/retention";

export async function newRetentionRecord(input: {
  renewalId: string;
  outcome: RetentionOutcome;
  reasonCode: RetentionReason;
  priorPremiumDollars: string;
  newPremiumDollars: string;
  recordedDate: string;
  notes: string;
}): Promise<void> {
  if (!input.renewalId) return;
  const tenant = await getCurrentTenant();
  const dollars = (v: string): number =>
    Math.round((Number.parseFloat(v) || 0) * 100);
  await createRetentionRecord({
    tenantId: tenant.id,
    renewalId: input.renewalId,
    outcome: input.outcome,
    reasonCode: input.reasonCode,
    priorPremiumCents: dollars(input.priorPremiumDollars),
    newPremiumCents: dollars(input.newPremiumDollars),
    recordedDate: input.recordedDate || null,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/renewals/retention");
}
