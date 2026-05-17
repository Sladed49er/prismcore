"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRegistry } from "@/lib/registry";
import { WORKSPACE_COOKIE } from "@/lib/tenant";

/**
 * Provision a workspace from a composer selection.
 *
 * Skeleton: the workspace is persisted to a cookie. When Neon is live this writes
 * `tenants` + `tenant_modules` rows and stores only the tenant id in the cookie.
 */
export async function createWorkspace(
  name: string,
  moduleIds: string[],
): Promise<void> {
  const registry = getRegistry();
  // Authoritative dependency resolution — never trust the client's closure.
  const resolved = registry.resolveForTenant(moduleIds).map((m) => m.id);

  const cleanName = name.trim() || "My Agency";
  const slug =
    cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "workspace";

  const store = await cookies();
  store.set(
    WORKSPACE_COOKIE,
    JSON.stringify({ name: cleanName, slug, moduleIds: resolved }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  );

  redirect("/dashboard");
}
