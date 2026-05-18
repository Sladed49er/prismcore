"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  prepareAcordForm,
  updateAcordForm,
  setAcordStatus,
  deleteAcordForm,
  type AcordStatus,
} from "@/lib/acord";

/** Prepare an ACORD form — prefills its fields from live data. */
export async function prepareForm(input: {
  clientId: string;
  policyId: string | null;
  formType: string;
  notes: string;
}): Promise<void> {
  if (!input.clientId || !input.formType.trim()) return;
  const tenant = await getCurrentTenant();
  await prepareAcordForm({
    tenantId: tenant.id,
    clientId: input.clientId,
    policyId: input.policyId || null,
    formType: input.formType.trim(),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/acord_forms");
}

/** Save edits to a prepared form. */
export async function saveForm(input: {
  id: string;
  status: AcordStatus;
  fieldValues: Record<string, string>;
  notes: string;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await updateAcordForm({ tenantId: tenant.id, ...input });
  revalidatePath("/m/acord_forms");
}

export async function advanceAcord(
  formId: string,
  status: AcordStatus,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setAcordStatus(tenant.id, formId, status);
  revalidatePath("/m/acord_forms");
}

export async function removeForm(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteAcordForm(tenant.id, id);
  revalidatePath("/m/acord_forms");
}
