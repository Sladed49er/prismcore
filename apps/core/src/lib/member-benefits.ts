import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  memberBenefits,
  type MemberBenefit,
} from "@prismcore/db";

/**
 * Member benefits data layer — the association's catalog of partner perks.
 * RLS-scoped through `withTenantContext`.
 */

export type { MemberBenefit };

export type MemberBenefitCategory =
  | "discount"
  | "service"
  | "resource"
  | "insurance"
  | "education"
  | "other";

export async function listMemberBenefits(
  tenantId: string,
): Promise<MemberBenefit[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(memberBenefits)
      .where(eq(memberBenefits.tenantId, tenantId))
      .orderBy(desc(memberBenefits.createdAt)),
  );
}

export async function createMemberBenefit(input: {
  tenantId: string;
  name: string;
  partnerName: string;
  category: MemberBenefitCategory;
  description: string;
  redemptionDetails: string;
  url: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(memberBenefits).values(input);
  });
}

export async function updateMemberBenefit(input: {
  tenantId: string;
  id: string;
  name: string;
  partnerName: string;
  category: MemberBenefitCategory;
  description: string;
  redemptionDetails: string;
  url: string;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(memberBenefits)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(memberBenefits.id, id));
  });
}

export async function setMemberBenefitActive(input: {
  tenantId: string;
  id: string;
  isActive: boolean;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(memberBenefits)
      .set({ isActive: input.isActive, updatedAt: new Date() })
      .where(eq(memberBenefits.id, input.id));
  });
}

export async function deleteMemberBenefit(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(memberBenefits).where(eq(memberBenefits.id, id));
  });
}
