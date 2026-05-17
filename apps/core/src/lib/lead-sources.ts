import { asc, eq } from "drizzle-orm";
import {
  withTenantContext,
  leadSources,
  type LeadSource,
} from "@prismcore/db";

export type { LeadSource };
export type LeadSourceType =
  | "referral"
  | "web"
  | "campaign"
  | "partner"
  | "cold"
  | "event"
  | "other";

export async function listLeadSources(
  tenantId: string,
): Promise<LeadSource[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(leadSources)
      .where(eq(leadSources.tenantId, tenantId))
      .orderBy(asc(leadSources.name)),
  );
}

export async function createLeadSource(input: {
  tenantId: string;
  name: string;
  sourceType: LeadSourceType;
  description: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(leadSources).values(input);
  });
}

export async function setLeadSourceActive(input: {
  tenantId: string;
  id: string;
  isActive: boolean;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(leadSources)
      .set({ isActive: input.isActive, updatedAt: new Date() })
      .where(eq(leadSources.id, input.id));
  });
}
