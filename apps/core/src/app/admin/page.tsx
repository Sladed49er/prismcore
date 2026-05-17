import Link from "next/link";
import { adminDb, tenants, tenantModules } from "@prismcore/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Platform-admin area — the cross-tenant view. Every tenant on the platform,
 * joined in one place. Guarded by `requireAdmin`: 404 for non-admins.
 */
export default async function AdminPage() {
  const viewer = await requireAdmin();
  const db = adminDb();

  const allTenants = await db.select().from(tenants);
  const allModules = await db
    .select({ tenantId: tenantModules.tenantId })
    .from(tenantModules);

  const moduleCount = new Map<string, number>();
  for (const m of allModules) {
    moduleCount.set(m.tenantId, (moduleCount.get(m.tenantId) ?? 0) + 1);
  }

  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            Platform Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold">All tenants</h1>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as {viewer.email} — platform administrator, full access.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm">
          <Link
            href="/admin/tickets"
            className="font-medium text-indigo-600 transition hover:text-indigo-700"
          >
            Ticket queue →
          </Link>
          <Link
            href="/dashboard"
            className="text-gray-400 transition hover:text-gray-600"
          >
            ← Workspace
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Tenant</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Modules</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allTenants.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-gray-500">{t.slug}</td>
                <td className="px-4 py-3 text-gray-500">{t.status}</td>
                <td className="px-4 py-3 text-gray-500">
                  {moduleCount.get(t.id) ?? 0}
                </td>
              </tr>
            ))}
            {allTenants.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-gray-400"
                >
                  No tenants yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-gray-400">
        {allTenants.length} tenant{allTenants.length === 1 ? "" : "s"} on the
        platform.
      </p>
    </main>
  );
}
