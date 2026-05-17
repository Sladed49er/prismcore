import { asc, eq } from "drizzle-orm";
import {
  withTenantContext,
  premiumInstallments,
  policies,
  type PremiumInstallment,
} from "@prismcore/db";

export type { PremiumInstallment };

export interface InstallmentRow extends PremiumInstallment {
  policyNumber: string;
}

export async function listInstallments(
  tenantId: string,
): Promise<InstallmentRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ inst: premiumInstallments, policy: policies })
      .from(premiumInstallments)
      .leftJoin(policies, eq(premiumInstallments.policyId, policies.id))
      .where(eq(premiumInstallments.tenantId, tenantId))
      .orderBy(asc(premiumInstallments.dueDate));
    return rows.map((r) => ({
      ...r.inst,
      policyNumber: r.policy?.policyNumber ?? "—",
    }));
  });
}

export async function createInstallment(input: {
  tenantId: string;
  policyId: string;
  installmentNumber: number;
  dueDate: string | null;
  amountCents: number;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(premiumInstallments).values(input);
  });
}

export async function markInstallmentPaid(input: {
  tenantId: string;
  id: string;
  paidCents: number;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(premiumInstallments)
      .set({ status: "paid", paidCents: input.paidCents, updatedAt: new Date() })
      .where(eq(premiumInstallments.id, input.id));
  });
}
