import { desc, eq } from "drizzle-orm";
import { withTenantContext, tasks, type Task } from "@prismcore/db";

export type { Task };
export type TaskStatus = "open" | "in_progress" | "done";
export type TaskPriority = "low" | "normal" | "high";

export async function listTasks(tenantId: string): Promise<Task[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId))
      .orderBy(desc(tasks.createdAt)),
  );
}

export async function createTask(input: {
  tenantId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: string;
  customValues: Record<string, string>;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(tasks).values(input);
  });
}

export async function setTaskStatus(
  tenantId: string,
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  });
}
