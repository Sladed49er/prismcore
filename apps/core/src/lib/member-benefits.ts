import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  memberBenefits,
  benefitRedemptions,
  type MemberBenefit,
  type BenefitRedemption,
} from "@prismcore/db";

/**
 * Member benefits data layer — the association's catalog of partner perks
 * and the record of each redemption. RLS-scoped through `withTenantContext`.
 */

export type { MemberBenefit, BenefitRedemption };

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

/* ── Redemptions ──────────────────────────────────────────────────── */

export interface BenefitRedemptionRow extends BenefitRedemption {
  benefitName: string;
}

export async function listBenefitRedemptions(
  tenantId: string,
): Promise<BenefitRedemptionRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ redemption: benefitRedemptions, benefit: memberBenefits })
      .from(benefitRedemptions)
      .leftJoin(
        memberBenefits,
        eq(benefitRedemptions.benefitId, memberBenefits.id),
      )
      .where(eq(benefitRedemptions.tenantId, tenantId))
      .orderBy(desc(benefitRedemptions.redeemedOn));
    return rows.map((r) => ({
      ...r.redemption,
      benefitName: r.benefit?.name ?? "—",
    }));
  });
}

export async function createBenefitRedemption(input: {
  tenantId: string;
  benefitId: string;
  memberName: string;
  redeemedOn: string | null;
  estimatedValueCents: number;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(benefitRedemptions).values(input);
  });
}

export async function deleteBenefitRedemption(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(benefitRedemptions)
      .where(eq(benefitRedemptions.id, id));
  });
}
