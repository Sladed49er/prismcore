"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createClientActivity,
  type ClientActivityType,
} from "@/lib/client-activities";

export async function newClientActivity(input: {
  clientId: string;
  activityType: ClientActivityType;
  subject: string;
  detail: string;
  activityDate: string;
  author: string;
}): Promise<void> {
  if (!input.clientId || !input.subject.trim()) return;
  const tenant = await getCurrentTenant();
  await createClientActivity({
    tenantId: tenant.id,
    clientId: input.clientId,
    activityType: input.activityType,
    subject: input.subject.trim(),
    detail: input.detail.trim(),
    activityDate: input.activityDate || null,
    author: input.author.trim(),
  });
  revalidatePath("/m/clients/activities");
}
