import { asc, eq } from "drizzle-orm";
import {
  withTenantContext,
  taskQueues,
  type TaskQueue,
} from "@prismcore/db";

export type { TaskQueue };

export async function listTaskQueues(
  tenantId: string,
): Promise<TaskQueue[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(taskQueues)
      .where(eq(taskQueues.tenantId, tenantId))
      .orderBy(asc(taskQueues.name)),
  );
}

export async function createTaskQueue(input: {
  tenantId: string;
  name: string;
  description: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(taskQueues).values(input);
  });
}
