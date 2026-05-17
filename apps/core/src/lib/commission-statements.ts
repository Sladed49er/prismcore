import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  commissionStatements,
  type CommissionStatement,
} from "@prismcore/db";

export type { CommissionStatement };
export type CommissionStatementStatus =
  | "received"
  | "reconciled"
  | "disputed";

export interface CommissionStatementRow extends CommissionStatement {
  /** Reported − expected: positive is an overage, negative a shortfall. */
  varianceCents: number;
}

export async function listCommissionStatements(
  tenantId: string,
): Promise<CommissionStatementRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(commissionStatements)
      .where(eq(commissionStatements.tenantId, tenantId))
      .orderBy(desc(commissionStatements.statementDate));
    return rows.map((r) => ({
      ...r,
      varianceCents: r.reportedCents - r.expectedCents,
    }));
  });
}

export async function createCommissionStatement(input: {
  tenantId: string;
  carrierName: string;
  statementDate: string | null;
  periodLabel: string;
  expectedCents: number;
  reportedCents: number;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(commissionStatements).values(input);
  });
}

export async function setCommissionStatementStatus(input: {
  tenantId: string;
  id: string;
  status: CommissionStatementStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(commissionStatements)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(commissionStatements.id, input.id));
  });
}
