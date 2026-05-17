"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createReconciliation, type ReconciliationStatus } from "@/lib/bank";

export async function addReconciliation(input: {
  accountName: string;
  statementDate: string;
  statementDollars: string;
  reconciledDollars: string;
  status: ReconciliationStatus;
  notes: string;
}): Promise<void> {
  if (!input.accountName.trim()) return;
  const tenant = await getCurrentTenant();
  await createReconciliation({
    tenantId: tenant.id,
    accountName: input.accountName.trim(),
    statementDate: input.statementDate || null,
    statementBalanceCents: Math.round(
      (Number.parseFloat(input.statementDollars) || 0) * 100,
    ),
    reconciledBalanceCents: Math.round(
      (Number.parseFloat(input.reconciledDollars) || 0) * 100,
    ),
    status: input.status,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/accounting/bank-reconciliation");
}
