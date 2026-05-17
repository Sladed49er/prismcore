"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createDocumentTemplate,
  setTemplateStatus,
  type DocumentTemplateStatus,
} from "@/lib/document-templates";

export async function newDocumentTemplate(input: {
  name: string;
  category: string;
  description: string;
  body: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createDocumentTemplate({
    tenantId: tenant.id,
    name: input.name.trim(),
    category: input.category.trim() || "General",
    description: input.description.trim(),
    body: input.body.trim(),
  });
  revalidatePath("/m/documents/templates");
}

export async function updateTemplateStatus(input: {
  id: string;
  status: DocumentTemplateStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setTemplateStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/documents/templates");
}
