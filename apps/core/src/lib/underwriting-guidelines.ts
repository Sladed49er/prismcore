import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  underwritingGuidelines,
  carriers,
  type UnderwritingGuideline,
} from "@prismcore/db";

export type { UnderwritingGuideline };
export type UnderwritingGuidelineStatus =
  | "current"
  | "under_review"
  | "retired";

export interface UnderwritingGuidelineRow extends UnderwritingGuideline {
  carrierName: string;
}

export async function listUnderwritingGuidelines(
  tenantId: string,
): Promise<UnderwritingGuidelineRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ guide: underwritingGuidelines, carrier: carriers })
      .from(underwritingGuidelines)
      .leftJoin(carriers, eq(underwritingGuidelines.carrierId, carriers.id))
      .where(eq(underwritingGuidelines.tenantId, tenantId))
      .orderBy(desc(underwritingGuidelines.createdAt));
    return rows.map((r) => ({
      ...r.guide,
      carrierName: r.carrier?.name ?? "—",
    }));
  });
}

export async function createUnderwritingGuideline(input: {
  tenantId: string;
  carrierId: string;
  lineOfBusiness: string;
  title: string;
  guidelines: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(underwritingGuidelines).values(input);
  });
}

export async function setGuidelineStatus(input: {
  tenantId: string;
  id: string;
  status: UnderwritingGuidelineStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(underwritingGuidelines)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(underwritingGuidelines.id, input.id));
  });
}
