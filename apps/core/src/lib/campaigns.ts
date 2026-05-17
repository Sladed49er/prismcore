import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  marketingCampaigns,
  type MarketingCampaign,
} from "@prismcore/db";

export type { MarketingCampaign };
export type CampaignStatus =
  | "planned"
  | "active"
  | "completed"
  | "cancelled";

export async function listCampaigns(
  tenantId: string,
): Promise<MarketingCampaign[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.tenantId, tenantId))
      .orderBy(desc(marketingCampaigns.startDate)),
  );
}

export async function createCampaign(input: {
  tenantId: string;
  name: string;
  channel: string;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(marketingCampaigns).values(input);
  });
}

export async function setCampaignStatus(input: {
  tenantId: string;
  id: string;
  status: CampaignStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(marketingCampaigns)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(marketingCampaigns.id, input.id));
  });
}
