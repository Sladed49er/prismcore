"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createAudit,
  setAuditStatus,
  type PremiumAuditStatus,
} from "@/lib/audits";

export async function newAudit(input: {
  policyId: string;
  auditType: string;
  periodStart: string;
  periodEnd: string;
  estimatedPremiumDollars: string;
  auditedPremiumDollars: string;
  notes: string;
}): Promise<void> {
  if (!input.policyId || !input.auditType.trim()) return;
  const tenant = await getCurrentTenant();
  const dollars = (v: string): number =>
    Math.round((Number.parseFloat(v) || 0) * 100);
  await createAudit({
    tenantId: tenant.id,
    policyId: input.policyId,
    auditType: input.auditType.trim(),
    periodStart: input.periodStart || null,
    periodEnd: input.periodEnd || null,
    estimatedPremiumCents: dollars(input.estimatedPremiumDollars),
    auditedPremiumCents: dollars(input.auditedPremiumDollars),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/policies/audits");
}

export async function updateAuditStatus(input: {
  id: string;
  status: PremiumAuditStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setAuditStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/policies/audits");
}
