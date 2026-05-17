import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRegistry } from "@/lib/registry";
import {
  listTenantModuleRows,
  listAdminTenants,
} from "@/lib/admin-modules";
import {
  AdminModulesPanel,
  type TenantModuleRowDTO,
  type AdminTenantOption,
  type ModuleOption,
} from "@/components/admin-modules-panel";

/** Platform-admin module management — cross-tenant module enablement. */
export default async function AdminModulesPage() {
  await requireAdmin();
  const [moduleRows, tenantRows] = await Promise.all([
    listTenantModuleRows(),
    listAdminTenants(),
  ]);

  const rows: TenantModuleRowDTO[] = moduleRows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    moduleId: r.moduleId,
    enabled: r.enabled,
  }));
  const tenants: AdminTenantOption[] = tenantRows.map((t) => ({
    id: t.id,
    name: t.name,
  }));
  const modules: ModuleOption[] = getRegistry()
    .all()
    .map((m) => ({ id: m.id, name: m.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            Platform Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Module Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enable or disable any module for any tenant. Changes are scoped to
            that tenant only.
          </p>
        </div>
        <Link
          href="/admin"
          className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
        >
          ← Console
        </Link>
      </div>
      <AdminModulesPanel rows={rows} tenants={tenants} modules={modules} />
    </main>
  );
}
