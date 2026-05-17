import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  claimLitigation,
  claims,
  type ClaimLitigation,
} from "@prismcore/db";

export type { ClaimLitigation };
export type LitigationStatus =
  | "pre_suit"
  | "filed"
  | "discovery"
  | "trial"
  | "settled"
  | "dismissed"
  | "closed";

export interface ClaimLitigationRow extends ClaimLitigation {
  claimNumber: string;
}

export async function listClaimLitigation(
  tenantId: string,
): Promise<ClaimLitigationRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ suit: claimLitigation, claim: claims })
      .from(claimLitigation)
      .leftJoin(claims, eq(claimLitigation.claimId, claims.id))
      .where(eq(claimLitigation.tenantId, tenantId))
      .orderBy(desc(claimLitigation.createdAt));
    return rows.map((r) => ({
      ...r.suit,
      claimNumber: r.claim?.claimNumber ?? "—",
    }));
  });
}

export async function createClaimLitigation(input: {
  tenantId: string;
  claimId: string;
  caseCaption: string;
  court: string;
  docketNumber: string;
  defenseAttorney: string;
  filedDate: string | null;
  trialDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(claimLitigation).values(input);
  });
}

export async function setLitigationStatus(input: {
  tenantId: string;
  id: string;
  status: LitigationStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(claimLitigation)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(claimLitigation.id, input.id));
  });
}
