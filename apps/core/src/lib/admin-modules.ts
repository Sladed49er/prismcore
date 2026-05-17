import { asc, eq } from "drizzle-orm";
import { adminDb, tenantModules, tenants } from "@prismcore/db";

/**
 * Cross-tenant module management — the platform-admin view of which modules
 * each tenant has turned on. Uses `adminDb()` (owner role) so it spans every
 * tenant; only ever reached behind `requireAdmin()`.
 */
export interface TenantModuleRow {
  id: string;
  tenantId: string;
  tenantName: string;
  moduleId: string;
  enabled: boolean;
}

export interface AdminTenantOption {
  id: string;
  name: string;
}

export async function listTenantModuleRows(): Promise<TenantModuleRow[]> {
  const rows = await adminDb()
    .select({ tm: tenantModules, t: tenants })
    .from(tenantModules)
    .leftJoin(tenants, eq(tenantModules.tenantId, tenants.id));
  return rows
    .map((r) => ({
      id: r.tm.id,
      tenantId: r.tm.tenantId,
      tenantName: r.t?.name ?? "—",
      moduleId: r.tm.moduleId,
      enabled: r.tm.enabled,
    }))
    .sort(
      (a, b) =>
        a.tenantName.localeCompare(b.tenantName) ||
        a.moduleId.localeCompare(b.moduleId),
    );
}

export async function listAdminTenants(): Promise<AdminTenantOption[]> {
  return adminDb()
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .orderBy(asc(tenants.name));
}

export async function setTenantModuleEnabled(input: {
  id: string;
  enabled: boolean;
}): Promise<void> {
  await adminDb()
    .update(tenantModules)
    .set({ enabled: input.enabled })
    .where(eq(tenantModules.id, input.id));
}

/** Enable a module for a tenant — idempotent on the (tenant, module) pair. */
export async function enableTenantModule(input: {
  tenantId: string;
  moduleId: string;
}): Promise<void> {
  await adminDb()
    .insert(tenantModules)
    .values({
      tenantId: input.tenantId,
      moduleId: input.moduleId,
      enabled: true,
    })
    .onConflictDoUpdate({
      target: [tenantModules.tenantId, tenantModules.moduleId],
      set: { enabled: true },
    });
}
