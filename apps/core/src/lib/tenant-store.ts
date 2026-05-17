import { eq } from "drizzle-orm";
import { adminDb, tenants, tenantModules } from "@prismcore/db";
import { getRegistry } from "@/lib/registry";
import { DEMO_TENANT, type TenantConfig } from "@/lib/tenant";

/**
 * The tenant store — tenant persistence against Neon Postgres.
 *
 * This replaces the cookie-backed skeleton: the cookie now holds only a tenant id,
 * and the workspace itself lives in `tenants` + `tenant_modules`. Kernel tables are
 * platform-level, so these use the admin connection; per-module tenant data added
 * later goes through `withTenantContext` + RLS.
 */

const DEMO_SLUG = "demo";

/** Read a tenant and its enabled module ids into a TenantConfig. */
async function readTenant(id: string): Promise<TenantConfig | null> {
  const db = adminDb();
  const rows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  const tenant = rows[0];
  if (!tenant) return null;

  const mods = await db
    .select({ moduleId: tenantModules.moduleId })
    .from(tenantModules)
    .where(eq(tenantModules.tenantId, id));

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    enabledModuleIds: mods.map((m) => m.moduleId),
  };
}

export async function getTenantById(id: string): Promise<TenantConfig | null> {
  return readTenant(id);
}

/** Provision a new tenant from a composer selection. */
export async function createTenant(input: {
  name: string;
  slug: string;
  moduleIds: string[];
}): Promise<TenantConfig> {
  const db = adminDb();
  // Authoritative dependency resolution against the registry.
  const moduleIds = getRegistry()
    .resolveForTenant(input.moduleIds)
    .map((m) => m.id);
  // Slugs are unique platform-wide — suffix to avoid collisions.
  const slug = `${input.slug}-${Math.random().toString(36).slice(2, 6)}`;

  const inserted = await db
    .insert(tenants)
    .values({ name: input.name, slug, status: "active" })
    .returning();
  const tenant = inserted[0]!;

  if (moduleIds.length > 0) {
    await db
      .insert(tenantModules)
      .values(moduleIds.map((moduleId) => ({ tenantId: tenant.id, moduleId })));
  }

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    enabledModuleIds: moduleIds,
  };
}

/** Get the demo tenant, seeding it (idempotently) on first access. */
export async function getOrCreateDemoTenant(): Promise<TenantConfig> {
  const db = adminDb();
  const existing = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, DEMO_SLUG))
    .limit(1);

  let demoId = existing[0]?.id;
  if (!demoId) {
    const inserted = await db
      .insert(tenants)
      .values({ name: DEMO_TENANT.name, slug: DEMO_SLUG, status: "active" })
      .onConflictDoNothing({ target: tenants.slug })
      .returning();
    demoId = inserted[0]?.id;
    if (!demoId) {
      // lost the create race — re-read
      const again = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, DEMO_SLUG))
        .limit(1);
      demoId = again[0]!.id;
    }
  }

  const moduleIds = getRegistry()
    .resolveForTenant(DEMO_TENANT.enabledModuleIds)
    .map((m) => m.id);
  await db
    .insert(tenantModules)
    .values(moduleIds.map((moduleId) => ({ tenantId: demoId!, moduleId })))
    .onConflictDoNothing();

  const config = await readTenant(demoId!);
  return config!;
}
