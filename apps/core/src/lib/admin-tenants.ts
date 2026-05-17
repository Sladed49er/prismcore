import { asc, eq } from "drizzle-orm";
import { adminDb, tenants, tenantModules } from "@prismcore/db";

/**
 * Platform-admin tenant provisioning. Uses `adminDb()` (owner role) — only ever
 * reached behind `requireAdmin()`.
 */
export interface AdminTenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  tier: string;
  moduleCount: number;
}

/** The full built module suite — the "Full suite" provisioning preset. */
export const FULL_SUITE: string[] = [
  "clients",
  "policies",
  "documents",
  "tasks",
  "renewals",
  "carriers",
  "claims",
  "certificates",
  "commissions",
  "accounting",
  "pipeline",
  "acord_forms",
  "intake_forms",
  "esign",
  "reports",
  "telephony",
  "api_clearinghouse",
];

export async function listAdminTenantRows(): Promise<AdminTenantRow[]> {
  const db = adminDb();
  const [tenantRows, moduleRows] = await Promise.all([
    db.select().from(tenants).orderBy(asc(tenants.name)),
    db.select({ tenantId: tenantModules.tenantId }).from(tenantModules),
  ]);
  const count = new Map<string, number>();
  for (const m of moduleRows) {
    count.set(m.tenantId, (count.get(m.tenantId) ?? 0) + 1);
  }
  return tenantRows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    tier: t.tier,
    moduleCount: count.get(t.id) ?? 0,
  }));
}

/** Provision a tenant with a clean slug; suffixes on collision. */
export async function createAdminTenant(input: {
  name: string;
  moduleIds: string[];
}): Promise<string> {
  const db = adminDb();
  const base =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "tenant";
  let slug = base;
  const clash = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  if (clash.length > 0) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const inserted = await db
    .insert(tenants)
    .values({ name: input.name, slug, status: "active" })
    .returning();
  const tenant = inserted[0]!;

  if (input.moduleIds.length > 0) {
    await db
      .insert(tenantModules)
      .values(
        input.moduleIds.map((moduleId) => ({
          tenantId: tenant.id,
          moduleId,
        })),
      )
      .onConflictDoNothing();
  }
  return tenant.id;
}

/** Confirm a tenant id exists — guards workspace switching. */
export async function tenantExists(id: string): Promise<boolean> {
  const rows = await adminDb()
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  return rows.length > 0;
}
