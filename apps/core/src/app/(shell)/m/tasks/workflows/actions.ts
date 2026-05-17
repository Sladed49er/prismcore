"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createTaskWorkflow,
  setWorkflowStatus,
  type TaskWorkflowStatus,
} from "@/lib/task-workflows";

export async function newTaskWorkflow(input: {
  name: string;
  description: string;
  steps: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createTaskWorkflow({
    tenantId: tenant.id,
    name: input.name.trim(),
    description: input.description.trim(),
    steps: input.steps.trim(),
  });
  revalidatePath("/m/tasks/workflows");
}

export async function updateWorkflowStatus(input: {
  id: string;
  status: TaskWorkflowStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setWorkflowStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/tasks/workflows");
}
