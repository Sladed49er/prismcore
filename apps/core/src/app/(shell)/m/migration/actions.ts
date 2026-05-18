"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createMigrationJob,
  updateMigrationJob,
  setMigrationStatus,
  deleteMigrationJob,
  type MigrationStatus,
} from "@/lib/migration";

const STATUSES: MigrationStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "failed",
];

function int(v: string): number {
  return Math.max(0, Math.round(Number.parseFloat(v) || 0));
}

export async function newMigrationJob(input: {
  name: string;
  sourceSystem: string;
  entityType: string;
  recordsExpected: string;
  notes: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createMigrationJob({
    tenantId: tenant.id,
    name: input.name.trim(),
    sourceSystem: input.sourceSystem.trim(),
    entityType: input.entityType.trim(),
    recordsExpected: int(input.recordsExpected),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/migration");
}

export async function editMigrationJob(input: {
  id: string;
  name: string;
  sourceSystem: string;
  entityType: string;
  recordsExpected: string;
  recordsImported: string;
  recordsFailed: string;
  notes: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateMigrationJob({
    tenantId: tenant.id,
    id: input.id,
    name: input.name.trim(),
    sourceSystem: input.sourceSystem.trim(),
    entityType: input.entityType.trim(),
    recordsExpected: int(input.recordsExpected),
    recordsImported: int(input.recordsImported),
    recordsFailed: int(input.recordsFailed),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/migration");
}

export async function updateMigrationJobStatus(input: {
  id: string;
  status: MigrationStatus;
}): Promise<void> {
  if (!STATUSES.includes(input.status)) return;
  const tenant = await getCurrentTenant();
  await setMigrationStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/migration");
}

export async function removeMigrationJob(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteMigrationJob(tenant.id, id);
  revalidatePath("/m/migration");
}
