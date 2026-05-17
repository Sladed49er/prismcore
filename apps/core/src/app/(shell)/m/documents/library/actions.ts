"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createDocument } from "@/lib/documents";

export async function addDocument(input: {
  name: string;
  category: string;
  notes: string;
  customValues: Record<string, string>;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createDocument({
    tenantId: tenant.id,
    name: input.name.trim(),
    category: input.category,
    notes: input.notes.trim(),
    customValues: input.customValues,
  });
  revalidatePath("/m/documents/library");
}
