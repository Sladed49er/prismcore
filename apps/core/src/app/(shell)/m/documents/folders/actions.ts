"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createDocumentFolder } from "@/lib/document-folders";

export async function newDocumentFolder(input: {
  name: string;
  description: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createDocumentFolder({
    tenantId: tenant.id,
    name: input.name.trim(),
    description: input.description.trim(),
  });
  revalidatePath("/m/documents/folders");
}
