import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  claimParties,
  claims,
  type ClaimParty,
} from "@prismcore/db";

export type { ClaimParty };
export type ClaimPartyRole =
  | "claimant"
  | "insured"
  | "witness"
  | "adjuster"
  | "attorney"
  | "third_party"
  | "expert"
  | "other";

export interface ClaimPartyRow extends ClaimParty {
  claimNumber: string;
}

export async function listClaimParties(
  tenantId: string,
): Promise<ClaimPartyRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ party: claimParties, claim: claims })
      .from(claimParties)
      .leftJoin(claims, eq(claimParties.claimId, claims.id))
      .where(eq(claimParties.tenantId, tenantId))
      .orderBy(desc(claimParties.createdAt));
    return rows.map((r) => ({
      ...r.party,
      claimNumber: r.claim?.claimNumber ?? "—",
    }));
  });
}

export async function createClaimParty(input: {
  tenantId: string;
  claimId: string;
  role: ClaimPartyRole;
  name: string;
  organization: string;
  phone: string;
  email: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(claimParties).values(input);
  });
}
