import Link from "next/link";
import { adminDb, tenants, tenantModules } from "@prismcore/db";
import { listAnnouncements } from "@/lib/platform-announcements";
import { requireAdmin } from "@/lib/auth";

/**
 * Platform-admin console — the cross-tenant control surface for the Prism
 * team. Guarded by `requireAdmin`: 404 for non-admins.
 */
export default async function AdminConsolePage() {
  const viewer = await requireAdmin();
  const db = adminDb();

  const [allTenants, allModules, announcements] = await Promise.all([
    db.select({ id: tenants.id, status: tenants.status }).from(tenants),
    db.select({ tenantId: tenantModules.tenantId }).from(tenantModules),
    listAnnouncements(),
  ]);

  const activeTenants = allTenants.filter((t) => t.status === "active").length;
  const publishedAnnouncements = announcements.filter(
    (a) => a.status === "published",
  ).length;

  const sections = [
    {
      href: "/admin/tenants",
      name: "Tenants",
      desc: "Every agency on the platform — status, tier, and module count.",
      stat: `${allTenants.length} total · ${activeTenants} active`,
    },
    {
      href: "/admin/tickets",
      name: "Ticket Queue",
      desc: "Every tenant's support tickets in one cross-tenant queue.",
      stat: "Support desk",
    },
    {
      href: "/admin/modules",
      name: "Module Management",
      desc: "Enable or disable modules for any tenant from one place.",
      stat: `${allModules.length} module assignments`,
    },
    {
      href: "/admin/billing",
      name: "Billing",
      desc: "Per-client billing — custom rates, complimentary accounts, terms.",
      stat: "Special conditions",
    },
    {
      href: "/admin/announcements",
      name: "Announcements",
      desc: "Broadcast maintenance notices and security advisories.",
      stat: `${publishedAnnouncements} published`,
    },
  ];

  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            Platform Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Console</h1>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as {viewer.email} — platform administrator, full access
            across every tenant.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
        >
          ← Workspace
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300"
          >
            <h3 className="font-semibold">{s.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {s.stat}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
