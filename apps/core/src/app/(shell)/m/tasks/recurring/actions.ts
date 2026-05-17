"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createRecurringTask,
  setRecurringTaskStatus,
  type RecurrenceFrequency,
  type RecurringTaskStatus,
  type TaskPriority,
} from "@/lib/recurring-tasks";

export async function newRecurringTask(input: {
  title: string;
  description: string;
  assignee: string;
  priority: TaskPriority;
  frequency: RecurrenceFrequency;
  nextDueDate: string;
}): Promise<void> {
  if (!input.title.trim()) return;
  const tenant = await getCurrentTenant();
  await createRecurringTask({
    tenantId: tenant.id,
    title: input.title.trim(),
    description: input.description.trim(),
    assignee: input.assignee.trim(),
    priority: input.priority,
    frequency: input.frequency,
    nextDueDate: input.nextDueDate || null,
  });
  revalidatePath("/m/tasks/recurring");
}

export async function updateRecurringTaskStatus(input: {
  id: string;
  status: RecurringTaskStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setRecurringTaskStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/tasks/recurring");
}
