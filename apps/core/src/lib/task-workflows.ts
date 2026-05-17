import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  taskWorkflows,
  type TaskWorkflow,
} from "@prismcore/db";

export type { TaskWorkflow };
export type TaskWorkflowStatus = "draft" | "active" | "archived";

export async function listTaskWorkflows(
  tenantId: string,
): Promise<TaskWorkflow[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(taskWorkflows)
      .where(eq(taskWorkflows.tenantId, tenantId))
      .orderBy(desc(taskWorkflows.createdAt)),
  );
}

export async function createTaskWorkflow(input: {
  tenantId: string;
  name: string;
  description: string;
  steps: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(taskWorkflows).values(input);
  });
}

export async function setWorkflowStatus(input: {
  tenantId: string;
  id: string;
  status: TaskWorkflowStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(taskWorkflows)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(taskWorkflows.id, input.id));
  });
}
