import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  policyCancellations,
  policies,
  type PolicyCancellation,
} from "@prismcore/db";

export type { PolicyCancellation };
export type CancellationType = "flat" | "pro_rata" | "short_rate";
export type CancellationStatus = "requested" | "processed" | "reinstated";

export interface CancellationRow extends PolicyCancellation {
  policyNumber: string;
}

export async function listCancellations(
  tenantId: string,
): Promise<CancellationRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ can: policyCancellations, policy: policies })
      .from(policyCancellations)
      .leftJoin(policies, eq(policyCancellations.policyId, policies.id))
      .where(eq(policyCancellations.tenantId, tenantId))
      .orderBy(desc(policyCancellations.createdAt));
    return rows.map((r) => ({
      ...r.can,
      policyNumber: r.policy?.policyNumber ?? "—",
    }));
  });
}

export async function createCancellation(input: {
  tenantId: string;
  policyId: string;
  requestDate: string | null;
  effectiveDate: string | null;
  reason: string;
  cancellationType: CancellationType;
  returnPremiumCents: number;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(policyCancellations).values(input);
  });
}

export async function setCancellationStatus(input: {
  tenantId: string;
  id: string;
  status: CancellationStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(policyCancellations)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(policyCancellations.id, input.id));
  });
}
