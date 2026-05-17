"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  setTenantModuleEnabled,
  enableTenantModule,
} from "@/lib/admin-modules";

export async function toggleModule(input: {
  id: string;
  enabled: boolean;
}): Promise<void> {
  await requireAdmin();
  await setTenantModuleEnabled(input);
  revalidatePath("/admin/modules");
}

export async function addModule(input: {
  tenantId: string;
  moduleId: string;
}): Promise<void> {
  await requireAdmin();
  if (!input.tenantId || !input.moduleId) return;
  await enableTenantModule(input);
  revalidatePath("/admin/modules");
}
