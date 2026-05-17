import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  claims,
  policies,
  clients,
  type Claim,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { Claim };
export type ClaimStatus =
  | "open"
  | "investigating"
  | "paid"
  | "closed"
  | "denied";

export interface ClaimRow extends Claim {
  policyNumber: string;
  clientName: string;
}

export async function listClaims(tenantId: string): Promise<ClaimRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ claim: claims, policy: policies, client: clients })
      .from(claims)
      .leftJoin(policies, eq(claims.policyId, policies.id))
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .where(eq(claims.tenantId, tenantId))
      .orderBy(desc(claims.createdAt));
    return rows.map((r) => ({
      ...r.claim,
      policyNumber: r.policy?.policyNumber ?? "—",
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createClaim(input: {
  tenantId: string;
  policyId: string;
  claimNumber: string;
  dateOfLoss: string | null;
  description: string;
  status: ClaimStatus;
  reserveCents: number;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(claims).values(input);
  });
}

export async function setClaimStatus(
  tenantId: string,
  claimId: string,
  status: ClaimStatus,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(claims)
      .set({ status, updatedAt: new Date() })
      .where(eq(claims.id, claimId));
  });
}
