"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createSequence,
  updateSequence,
  deleteSequence,
  enrollClient,
  cancelEnrollment,
} from "@/lib/marketing-engine";
import type { SequenceStep } from "@prismcore/db";

const PATH = "/m/marketing/sequences";

export async function addSequence(name: string): Promise<void> {
  if (!name.trim()) return;
  const tenant = await getCurrentTenant();
  await createSequence(tenant.id, name.trim());
  revalidatePath(PATH);
}

export async function saveSequence(input: {
  id: string;
  name: string;
  status: string;
  steps: SequenceStep[];
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateSequence({ tenantId: tenant.id, ...input });
  revalidatePath(PATH);
}

export async function removeSequence(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteSequence(tenant.id, id);
  revalidatePath(PATH);
}

export async function enroll(
  sequenceId: string,
  clientId: string,
): Promise<{ ok: boolean; message: string }> {
  const tenant = await getCurrentTenant();
  const result = await enrollClient(tenant.id, sequenceId, clientId);
  revalidatePath(PATH);
  return result;
}

export async function cancelEnroll(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await cancelEnrollment(tenant.id, id);
  revalidatePath(PATH);
}
