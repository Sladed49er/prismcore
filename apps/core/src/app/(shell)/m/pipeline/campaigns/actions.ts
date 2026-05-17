"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCampaign,
  setCampaignStatus,
  type CampaignStatus,
} from "@/lib/campaigns";

export async function newCampaign(input: {
  name: string;
  channel: string;
  startDate: string;
  endDate: string;
  budgetDollars: string;
  notes: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createCampaign({
    tenantId: tenant.id,
    name: input.name.trim(),
    channel: input.channel.trim(),
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    budgetCents: Math.round(
      (Number.parseFloat(input.budgetDollars) || 0) * 100,
    ),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/pipeline/campaigns");
}

export async function updateCampaignStatus(input: {
  id: string;
  status: CampaignStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setCampaignStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/pipeline/campaigns");
}
