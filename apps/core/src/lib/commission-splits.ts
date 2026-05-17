import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  commissionSplits,
  commissions,
  policies,
  producers,
  type CommissionSplit,
} from "@prismcore/db";

export type { CommissionSplit };

export interface CommissionSplitRow extends CommissionSplit {
  policyNumber: string;
  commissionAmountCents: number;
  producerName: string;
}

export async function listCommissionSplits(
  tenantId: string,
): Promise<CommissionSplitRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        split: commissionSplits,
        commission: commissions,
        policy: policies,
        producer: producers,
      })
      .from(commissionSplits)
      .leftJoin(commissions, eq(commissionSplits.commissionId, commissions.id))
      .leftJoin(policies, eq(commissions.policyId, policies.id))
      .leftJoin(producers, eq(commissionSplits.producerId, producers.id))
      .where(eq(commissionSplits.tenantId, tenantId))
      .orderBy(desc(commissionSplits.createdAt));
    return rows.map((r) => ({
      ...r.split,
      policyNumber: r.policy?.policyNumber ?? "—",
      commissionAmountCents: r.commission?.amountCents ?? 0,
      producerName: r.producer?.name ?? "—",
    }));
  });
}

export async function createCommissionSplit(input: {
  tenantId: string;
  commissionId: string;
  producerId: string;
  sharePercent: string;
  amountCents: number;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(commissionSplits).values(input);
  });
}
