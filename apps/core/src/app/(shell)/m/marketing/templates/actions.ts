"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/marketing-engine";

const PATH = "/m/marketing/templates";

export async function addTemplate(input: {
  name: string;
  subject: string;
  body: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createTemplate({ tenantId: tenant.id, ...input });
  revalidatePath(PATH);
}

export async function editTemplate(input: {
  id: string;
  name: string;
  subject: string;
  body: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateTemplate({ tenantId: tenant.id, ...input });
  revalidatePath(PATH);
}

export async function removeTemplate(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteTemplate(tenant.id, id);
  revalidatePath(PATH);
}
