import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  policyEndorsements,
  policies,
  type PolicyEndorsement,
} from "@prismcore/db";

export type { PolicyEndorsement };
export type EndorsementStatus = "pending" | "issued" | "voided";

export interface EndorsementRow extends PolicyEndorsement {
  policyNumber: string;
}

export async function listEndorsements(
  tenantId: string,
): Promise<EndorsementRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ end: policyEndorsements, policy: policies })
      .from(policyEndorsements)
      .leftJoin(policies, eq(policyEndorsements.policyId, policies.id))
      .where(eq(policyEndorsements.tenantId, tenantId))
      .orderBy(desc(policyEndorsements.createdAt));
    return rows.map((r) => ({
      ...r.end,
      policyNumber: r.policy?.policyNumber ?? "—",
    }));
  });
}

export async function createEndorsement(input: {
  tenantId: string;
  policyId: string;
  endorsementNumber: string;
  effectiveDate: string | null;
  description: string;
  premiumChangeCents: number;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(policyEndorsements).values(input);
  });
}

export async function setEndorsementStatus(input: {
  tenantId: string;
  id: string;
  status: EndorsementStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(policyEndorsements)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(policyEndorsements.id, input.id));
  });
}
