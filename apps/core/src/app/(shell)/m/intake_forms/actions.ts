"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createIntake, setIntakeStatus, type IntakeStatus } from "@/lib/intake";
import {
  createForm,
  updateForm,
  deleteForm,
  convertSubmissionToLead,
  archiveSubmission,
  type IntakeFormField,
} from "@/lib/intake-forms";

export async function addIntake(input: {
  name: string;
  email: string;
  phone: string;
  interest: string;
  status: IntakeStatus;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createIntake({
    tenantId: tenant.id,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    interest: input.interest.trim(),
    status: input.status,
  });
  revalidatePath("/m/intake_forms");
}

export async function advanceIntake(
  submissionId: string,
  status: IntakeStatus,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setIntakeStatus(tenant.id, submissionId, status);
  revalidatePath("/m/intake_forms");
}

// ── Form builder ────────────────────────────────────────────────────

export async function addForm(name: string): Promise<void> {
  if (!name.trim()) return;
  const tenant = await getCurrentTenant();
  await createForm(tenant.id, name.trim());
  revalidatePath("/m/intake_forms");
}

export async function saveForm(input: {
  id: string;
  name: string;
  description: string;
  status: string;
  fields: IntakeFormField[];
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateForm({ tenantId: tenant.id, ...input });
  revalidatePath("/m/intake_forms");
}

export async function removeForm(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteForm(tenant.id, id);
  revalidatePath("/m/intake_forms");
}

export async function convertSubmission(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  const tenant = await getCurrentTenant();
  const result = await convertSubmissionToLead(tenant.id, id);
  revalidatePath("/m/intake_forms");
  return result;
}

export async function archiveIntakeSubmission(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await archiveSubmission(tenant.id, id);
  revalidatePath("/m/intake_forms");
}
