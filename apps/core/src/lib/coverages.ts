import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  policyCoverages,
  policies,
  type PolicyCoverage,
} from "@prismcore/db";

export type { PolicyCoverage };

export interface CoverageRow extends PolicyCoverage {
  policyNumber: string;
}

export async function listCoverages(
  tenantId: string,
): Promise<CoverageRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ cov: policyCoverages, policy: policies })
      .from(policyCoverages)
      .leftJoin(policies, eq(policyCoverages.policyId, policies.id))
      .where(eq(policyCoverages.tenantId, tenantId))
      .orderBy(desc(policyCoverages.createdAt));
    return rows.map((r) => ({
      ...r.cov,
      policyNumber: r.policy?.policyNumber ?? "—",
    }));
  });
}

export async function createCoverage(input: {
  tenantId: string;
  policyId: string;
  coverageType: string;
  limitText: string;
  deductibleCents: number;
  premiumCents: number;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(policyCoverages).values(input);
  });
}
