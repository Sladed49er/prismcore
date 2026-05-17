"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCommissionStatement,
  setCommissionStatementStatus,
  type CommissionStatementStatus,
} from "@/lib/commission-statements";

export async function newCommissionStatement(input: {
  carrierName: string;
  statementDate: string;
  periodLabel: string;
  expectedDollars: string;
  reportedDollars: string;
  notes: string;
}): Promise<void> {
  if (!input.carrierName.trim()) return;
  const tenant = await getCurrentTenant();
  const dollars = (v: string): number =>
    Math.round((Number.parseFloat(v) || 0) * 100);
  await createCommissionStatement({
    tenantId: tenant.id,
    carrierName: input.carrierName.trim(),
    statementDate: input.statementDate || null,
    periodLabel: input.periodLabel.trim(),
    expectedCents: dollars(input.expectedDollars),
    reportedCents: dollars(input.reportedDollars),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/commissions/statements");
}

export async function updateStatementStatus(input: {
  id: string;
  status: CommissionStatementStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setCommissionStatementStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/commissions/statements");
}
