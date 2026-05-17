"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createTask,
  setTaskStatus,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/tasks";

export async function addTask(input: {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignee: string;
  customValues: Record<string, string>;
}): Promise<void> {
  if (!input.title.trim()) return;
  const tenant = await getCurrentTenant();
  await createTask({
    tenantId: tenant.id,
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate || null,
    assignee: input.assignee.trim(),
    customValues: input.customValues,
  });
  revalidatePath("/m/tasks");
}

export async function advanceTask(
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setTaskStatus(tenant.id, taskId, status);
  revalidatePath("/m/tasks");
}
