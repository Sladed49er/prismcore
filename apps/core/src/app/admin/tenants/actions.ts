"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { WORKSPACE_COOKIE } from "@/lib/tenant";
import {
  createAdminTenant,
  tenantExists,
  FULL_SUITE,
} from "@/lib/admin-tenants";

export type TenantPreset = "full" | "telephony" | "empty";

const PRESET_MODULES: Record<TenantPreset, string[]> = {
  full: FULL_SUITE,
  telephony: ["telephony"],
  empty: [],
};

/** Provision a new tenant from the admin console. */
export async function newTenant(input: {
  name: string;
  preset: TenantPreset;
}): Promise<void> {
  await requireAdmin();
  if (!input.name.trim()) return;
  await createAdminTenant({
    name: input.name.trim(),
    moduleIds: PRESET_MODULES[input.preset] ?? [],
  });
  revalidatePath("/admin/tenants");
}

/**
 * Switch the platform admin into a tenant's workspace — sets the workspace
 * cookie and drops them on that tenant's dashboard.
 */
export async function openWorkspace(tenantId: string): Promise<void> {
  await requireAdmin();
  if (!tenantId || !(await tenantExists(tenantId))) return;
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}
