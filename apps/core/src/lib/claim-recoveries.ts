import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  claimRecoveries,
  claims,
  type ClaimRecovery,
} from "@prismcore/db";

export type { ClaimRecovery };
export type RecoveryType =
  | "subrogation"
  | "salvage"
  | "deductible"
  | "other";
export type RecoveryStatus =
  | "pursuing"
  | "recovered"
  | "closed"
  | "abandoned";

export interface ClaimRecoveryRow extends ClaimRecovery {
  claimNumber: string;
}

export async function listClaimRecoveries(
  tenantId: string,
): Promise<ClaimRecoveryRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ recovery: claimRecoveries, claim: claims })
      .from(claimRecoveries)
      .leftJoin(claims, eq(claimRecoveries.claimId, claims.id))
      .where(eq(claimRecoveries.tenantId, tenantId))
      .orderBy(desc(claimRecoveries.createdAt));
    return rows.map((r) => ({
      ...r.recovery,
      claimNumber: r.claim?.claimNumber ?? "—",
    }));
  });
}

export async function createClaimRecovery(input: {
  tenantId: string;
  claimId: string;
  recoveryType: RecoveryType;
  description: string;
  expectedCents: number;
  recoveredCents: number;
  recoveryDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(claimRecoveries).values(input);
  });
}

export async function setClaimRecoveryStatus(input: {
  tenantId: string;
  id: string;
  status: RecoveryStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(claimRecoveries)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(claimRecoveries.id, input.id));
  });
}
