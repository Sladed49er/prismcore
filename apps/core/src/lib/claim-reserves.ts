import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  claimReserveEntries,
  claims,
  type ClaimReserveEntry,
} from "@prismcore/db";

export type { ClaimReserveEntry };
export type ReserveType = "indemnity" | "expense" | "legal" | "medical";

export interface ReserveEntryRow extends ClaimReserveEntry {
  claimNumber: string;
}

export async function listReserveEntries(
  tenantId: string,
): Promise<ReserveEntryRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ entry: claimReserveEntries, claim: claims })
      .from(claimReserveEntries)
      .leftJoin(claims, eq(claimReserveEntries.claimId, claims.id))
      .where(eq(claimReserveEntries.tenantId, tenantId))
      .orderBy(desc(claimReserveEntries.createdAt));
    return rows.map((r) => ({
      ...r.entry,
      claimNumber: r.claim?.claimNumber ?? "—",
    }));
  });
}

export async function createReserveEntry(input: {
  tenantId: string;
  claimId: string;
  entryDate: string | null;
  reserveType: ReserveType;
  changeCents: number;
  reason: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(claimReserveEntries).values(input);
  });
}
