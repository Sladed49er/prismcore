import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  migrationJobs,
  type MigrationJob,
} from "@prismcore/db";

/**
 * Migration data layer — legacy-AMS data-import jobs tracked during agency
 * onboarding. RLS-scoped through `withTenantContext`.
 */

export type { MigrationJob };

export type MigrationStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export async function listMigrationJobs(
  tenantId: string,
): Promise<MigrationJob[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(migrationJobs)
      .where(eq(migrationJobs.tenantId, tenantId))
      .orderBy(desc(migrationJobs.createdAt)),
  );
}

export async function createMigrationJob(input: {
  tenantId: string;
  name: string;
  sourceSystem: string;
  entityType: string;
  recordsExpected: number;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(migrationJobs).values(input);
  });
}

export async function updateMigrationJob(input: {
  tenantId: string;
  id: string;
  name: string;
  sourceSystem: string;
  entityType: string;
  recordsExpected: number;
  recordsImported: number;
  recordsFailed: number;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(migrationJobs)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(migrationJobs.id, id));
  });
}

/**
 * Move a job to a new status, stamping `startedAt`/`completedAt` as it crosses
 * those thresholds (only the first time, so re-runs don't churn the dates).
 */
export async function setMigrationStatus(input: {
  tenantId: string;
  id: string;
  status: MigrationStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    const [job] = await tx
      .select()
      .from(migrationJobs)
      .where(eq(migrationJobs.id, input.id));
    if (!job) return;
    const patch: Record<string, unknown> = {
      status: input.status,
      updatedAt: new Date(),
    };
    if (input.status === "in_progress" && !job.startedAt) {
      patch.startedAt = new Date();
    }
    if (
      (input.status === "completed" || input.status === "failed") &&
      !job.completedAt
    ) {
      patch.completedAt = new Date();
    }
    await tx
      .update(migrationJobs)
      .set(patch)
      .where(eq(migrationJobs.id, input.id));
  });
}

export async function deleteMigrationJob(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(migrationJobs).where(eq(migrationJobs.id, id));
  });
}
