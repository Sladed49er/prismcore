"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createTaskQueue } from "@/lib/task-queues";

export async function newTaskQueue(input: {
  name: string;
  description: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createTaskQueue({
    tenantId: tenant.id,
    name: input.name.trim(),
    description: input.description.trim(),
  });
  revalidatePath("/m/tasks/queues");
}
