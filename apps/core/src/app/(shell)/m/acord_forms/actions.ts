"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createAcordForm, setAcordStatus, type AcordStatus } from "@/lib/acord";

export async function addAcordForm(input: {
  clientId: string;
  formType: string;
  status: AcordStatus;
  notes: string;
}): Promise<void> {
  if (!input.clientId || !input.formType.trim()) return;
  const tenant = await getCurrentTenant();
  await createAcordForm({
    tenantId: tenant.id,
    clientId: input.clientId,
    formType: input.formType.trim(),
    status: input.status,
    notes: input.notes.trim(),
  });
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
