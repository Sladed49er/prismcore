"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createOpportunity,
  setOpportunityStage,
  type PipelineStage,
} from "@/lib/pipeline";

export async function addOpportunity(input: {
  clientId: string;
  name: string;
  stage: PipelineStage;
  valueDollars: string;
  notes: string;
  expectedCloseDate: string;
}): Promise<void> {
  if (!input.clientId || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createOpportunity({
    tenantId: tenant.id,
    clientId: input.clientId,
    name: input.name.trim(),
    stage: input.stage,
    valueCents: Math.round(
      (Number.parseFloat(input.valueDollars) || 0) * 100,
    ),
    notes: input.notes.trim(),
    expectedCloseDate: input.expectedCloseDate || null,
  });
  revalidatePath("/m/pipeline");
}

export async function advanceStage(
  opportunityId: string,
  stage: PipelineStage,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setOpportunityStage(tenant.id, opportunityId, stage);
  revalidatePath("/m/pipeline");
}
