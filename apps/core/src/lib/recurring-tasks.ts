import { asc, eq } from "drizzle-orm";
import {
  withTenantContext,
  recurringTasks,
  type RecurringTask,
} from "@prismcore/db";

export type { RecurringTask };
export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annually";
export type RecurringTaskStatus = "active" | "paused";
export type TaskPriority = "low" | "normal" | "high";

export async function listRecurringTasks(
  tenantId: string,
): Promise<RecurringTask[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(recurringTasks)
      .where(eq(recurringTasks.tenantId, tenantId))
      .orderBy(asc(recurringTasks.nextDueDate)),
  );
}

export async function createRecurringTask(input: {
  tenantId: string;
  title: string;
  description: string;
  assignee: string;
  priority: TaskPriority;
  frequency: RecurrenceFrequency;
  nextDueDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(recurringTasks).values(input);
  });
}

export async function setRecurringTaskStatus(input: {
  tenantId: string;
  id: string;
  status: RecurringTaskStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(recurringTasks)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(recurringTasks.id, input.id));
  });
}
