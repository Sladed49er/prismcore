"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createScheduleItem,
  type ScheduleItemType,
} from "@/lib/schedules";

export async function newScheduleItem(input: {
  policyId: string;
  itemType: ScheduleItemType;
  description: string;
  identifier: string;
  valueDollars: string;
  notes: string;
}): Promise<void> {
  if (!input.policyId || !input.description.trim()) return;
  const tenant = await getCurrentTenant();
  await createScheduleItem({
    tenantId: tenant.id,
    policyId: input.policyId,
    itemType: input.itemType,
    description: input.description.trim(),
    identifier: input.identifier.trim(),
    valueCents: Math.round((Number.parseFloat(input.valueDollars) || 0) * 100),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/policies/schedules");
}
