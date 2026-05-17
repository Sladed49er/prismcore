import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  bankReconciliations,
  type BankReconciliation,
} from "@prismcore/db";

export type { BankReconciliation };
export type ReconciliationStatus = "in_progress" | "completed";

export interface ReconciliationRow extends BankReconciliation {
  /** Statement balance minus reconciled balance; zero means it ties out. */
  differenceCents: number;
}

export async function listReconciliations(
  tenantId: string,
): Promise<ReconciliationRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(bankReconciliations)
      .where(eq(bankReconciliations.tenantId, tenantId))
      .orderBy(desc(bankReconciliations.createdAt));
    return rows.map((r) => ({
      ...r,
      differenceCents: r.statementBalanceCents - r.reconciledBalanceCents,
    }));
  });
}

export async function createReconciliation(input: {
  tenantId: string;
  accountName: string;
  statementDate: string | null;
  statementBalanceCents: number;
  reconciledBalanceCents: number;
  status: ReconciliationStatus;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(bankReconciliations).values(input);
  });
}
