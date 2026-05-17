import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAdminTenantRows } from "@/lib/admin-tenants";
import {
  AdminTenantsPanel,
  type AdminTenantDTO,
} from "@/components/admin-tenants-panel";

/** Platform-admin tenant directory — provision tenants and switch into them. */
export default async function AdminTenantsPage() {
  await requireAdmin();
  const rows = await listAdminTenantRows();

  const tenants: AdminTenantDTO[] = rows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    tier: t.tier,
    moduleCount: t.moduleCount,
  }));

  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            Platform Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Tenants</h1>
          <p className="mt-1 text-sm text-gray-500">
            Provision a tenant, or open any workspace to work inside it.
          </p>
        </div>
        <Link
          href="/admin"
          className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
        >
          ← Console
        </Link>
      </div>
      <AdminTenantsPanel tenants={tenants} />
    </main>
  );
}
