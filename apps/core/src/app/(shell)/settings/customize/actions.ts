"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { addCustomField, removeCustomField } from "@/lib/customization";

type FieldType = "text" | "number" | "date" | "select" | "checkbox";

export async function addField(input: {
  moduleId: string;
  entityKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
}): Promise<void> {
  const label = input.label.trim();
  if (!label) return;
  const tenant = await getCurrentTenant();
  await addCustomField({ ...input, label, tenantId: tenant.id });
  revalidatePath("/settings/customize");
}

export async function removeField(fieldId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await removeCustomField(tenant.id, fieldId);
  revalidatePath("/settings/customize");
}
