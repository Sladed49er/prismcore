import { cookies } from "next/headers";
import { WORKSPACE_COOKIE, type TenantConfig } from "@/lib/tenant";
import { getTenantById, getOrCreateDemoTenant } from "@/lib/tenant-store";

/**
 * Resolve the current tenant.
 *
 * The workspace cookie holds a tenant id; the tenant itself lives in Neon
 * (`tenants` / `tenant_modules`). With no cookie — or a stale one — the demo
 * tenant is used (and seeded on first access).
 */
export async function getCurrentTenant(): Promise<TenantConfig> {
  const id = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  if (id) {
    const tenant = await getTenantById(id);
    if (tenant) return tenant;
  }
  return getOrCreateDemoTenant();
}
