"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createLeadSource,
  setLeadSourceActive,
  type LeadSourceType,
} from "@/lib/lead-sources";

export async function newLeadSource(input: {
  name: string;
  sourceType: LeadSourceType;
  description: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createLeadSource({
    tenantId: tenant.id,
    name: input.name.trim(),
    sourceType: input.sourceType,
    description: input.description.trim(),
  });
  revalidatePath("/m/pipeline/sources");
}

export async function toggleLeadSource(input: {
  id: string;
  isActive: boolean;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setLeadSourceActive({
    tenantId: tenant.id,
    id: input.id,
    isActive: input.isActive,
  });
  revalidatePath("/m/pipeline/sources");
}
