import { cookies } from "next/headers";
import { WORKSPACE_COOKIE, DEMO_TENANT, type TenantConfig } from "@/lib/tenant";

/**
 * Resolve the current tenant.
 *
 * Skeleton implementation: the workspace lives in a cookie written by the composer.
 * When Neon is provisioned (Days 7-10) the cookie holds only a tenant id and this
 * reads the `tenants` / `tenant_modules` tables instead — nothing else changes.
 */
export async function getCurrentTenant(): Promise<TenantConfig> {
  const raw = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  if (!raw) return DEMO_TENANT;

  try {
    const parsed = JSON.parse(raw) as {
      name?: unknown;
      slug?: unknown;
      moduleIds?: unknown;
    };
    if (
      typeof parsed.name === "string" &&
      typeof parsed.slug === "string" &&
      Array.isArray(parsed.moduleIds)
    ) {
      return {
        id: parsed.slug,
        name: parsed.name,
        slug: parsed.slug,
        enabledModuleIds: parsed.moduleIds.filter(
          (m): m is string => typeof m === "string",
        ),
      };
    }
  } catch {
    // malformed cookie — fall through to the demo tenant
  }
  return DEMO_TENANT;
}
