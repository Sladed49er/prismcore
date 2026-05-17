import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  premiumAudits,
  policies,
  type PremiumAudit,
} from "@prismcore/db";

export type { PremiumAudit };
export type PremiumAuditStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "disputed";

export interface PremiumAuditRow extends PremiumAudit {
  policyNumber: string;
  /** Audited − estimated: positive is additional premium, negative a return. */
  adjustmentCents: number;
}

export async function listAudits(
  tenantId: string,
): Promise<PremiumAuditRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ audit: premiumAudits, policy: policies })
      .from(premiumAudits)
      .leftJoin(policies, eq(premiumAudits.policyId, policies.id))
      .where(eq(premiumAudits.tenantId, tenantId))
      .orderBy(desc(premiumAudits.createdAt));
    return rows.map((r) => ({
      ...r.audit,
      policyNumber: r.policy?.policyNumber ?? "—",
      adjustmentCents:
        r.audit.auditedPremiumCents - r.audit.estimatedPremiumCents,
    }));
  });
}

export async function createAudit(input: {
  tenantId: string;
  policyId: string;
  auditType: string;
  periodStart: string | null;
  periodEnd: string | null;
  estimatedPremiumCents: number;
  auditedPremiumCents: number;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(premiumAudits).values(input);
  });
}

export async function setAuditStatus(input: {
  tenantId: string;
  id: string;
  status: PremiumAuditStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(premiumAudits)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(premiumAudits.id, input.id));
  });
}
