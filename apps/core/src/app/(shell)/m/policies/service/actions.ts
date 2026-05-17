"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createServiceActivity,
  setServiceActivityStatus,
  type ServiceActivityType,
  type ServiceActivityStatus,
} from "@/lib/service-activities";

export async function newServiceActivity(input: {
  policyId: string;
  activityType: ServiceActivityType;
  subject: string;
  detail: string;
  assignedTo: string;
  dueDate: string;
}): Promise<void> {
  if (!input.policyId || !input.subject.trim()) return;
  const tenant = await getCurrentTenant();
  await createServiceActivity({
    tenantId: tenant.id,
    policyId: input.policyId,
    activityType: input.activityType,
    subject: input.subject.trim(),
    detail: input.detail.trim(),
    assignedTo: input.assignedTo.trim(),
    dueDate: input.dueDate || null,
  });
  revalidatePath("/m/policies/service");
}

export async function updateServiceActivityStatus(input: {
  id: string;
  status: ServiceActivityStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setServiceActivityStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/policies/service");
}
