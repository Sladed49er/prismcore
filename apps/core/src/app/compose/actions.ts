"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WORKSPACE_COOKIE } from "@/lib/tenant";
import { createTenant } from "@/lib/tenant-store";
import { isPlatformAdmin } from "@/lib/auth";

/**
 * Provision a workspace from a composer selection: insert the tenant and its
 * `tenant_modules` rows in Neon, then store the tenant id in the workspace cookie.
 */
export async function createWorkspace(
  name: string,
  moduleIds: string[],
): Promise<void> {
  if (!(await isPlatformAdmin())) {
    throw new Error("Creating workspaces requires a platform admin.");
  }
  const cleanName = name.trim() || "My Agency";
  const baseSlug =
    cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "workspace";

  const tenant = await createTenant({
    name: cleanName,
    slug: baseSlug,
    moduleIds,
  });

  const store = await cookies();
  store.set(WORKSPACE_COOKIE, tenant.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}
