"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createUnderwritingGuideline,
  setGuidelineStatus,
  type UnderwritingGuidelineStatus,
} from "@/lib/underwriting-guidelines";

export async function newUnderwritingGuideline(input: {
  carrierId: string;
  lineOfBusiness: string;
  title: string;
  guidelines: string;
}): Promise<void> {
  if (!input.carrierId || !input.title.trim()) return;
  const tenant = await getCurrentTenant();
  await createUnderwritingGuideline({
    tenantId: tenant.id,
    carrierId: input.carrierId,
    lineOfBusiness: input.lineOfBusiness.trim(),
    title: input.title.trim(),
    guidelines: input.guidelines.trim(),
  });
  revalidatePath("/m/carriers/guidelines");
}

export async function updateGuidelineStatus(input: {
  id: string;
  status: UnderwritingGuidelineStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setGuidelineStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/carriers/guidelines");
}
