import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  migrationJobs,
  migrationFieldMappings,
  type MigrationJob,
  type MigrationFieldMapping,
} from "@prismcore/db";

/**
 * Migration data layer — legacy-AMS data-import jobs and their field maps.
 * RLS-scoped through `withTenantContext`.
 */

export type { MigrationJob, MigrationFieldMapping };

export type FieldMappingStatus = "mapped" | "needs_review" | "skipped";

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

/* ── Field mappings ───────────────────────────────────────────────── */

export interface MigrationFieldMappingRow extends MigrationFieldMapping {
  jobName: string;
}

export async function listFieldMappings(
  tenantId: string,
): Promise<MigrationFieldMappingRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ mapping: migrationFieldMappings, job: migrationJobs })
      .from(migrationFieldMappings)
      .leftJoin(
        migrationJobs,
        eq(migrationFieldMappings.jobId, migrationJobs.id),
      )
      .where(eq(migrationFieldMappings.tenantId, tenantId))
      .orderBy(desc(migrationFieldMappings.createdAt));
    return rows.map((r) => ({
      ...r.mapping,
      jobName: r.job?.name ?? "—",
    }));
  });
}

export async function createFieldMapping(input: {
  tenantId: string;
  jobId: string;
  sourceField: string;
  targetField: string;
  transform: string;
  status: FieldMappingStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(migrationFieldMappings).values(input);
  });
}

export async function setFieldMappingStatus(input: {
  tenantId: string;
  id: string;
  status: FieldMappingStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(migrationFieldMappings)
      .set({ status: input.status })
      .where(eq(migrationFieldMappings.id, input.id));
  });
}

export async function deleteFieldMapping(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(migrationFieldMappings)
      .where(eq(migrationFieldMappings.id, id));
  });
}
