import Link from "next/link";
import { getCurrentTenant } from "@/lib/current-tenant";
import { listTickets } from "@/lib/tickets";
import { listTenantUsers } from "@/lib/tenant-users";
import { loadCurrentTenant } from "@/lib/kernel";
import { listPublishedAnnouncements } from "@/lib/platform-announcements";

/**
 * The customer's own account console — everything here is scoped to this one
 * tenant. A customer never sees, and cannot reach, another tenant's data.
 */
export default async function SupportConsolePage() {
  const tenant = await getCurrentTenant();
  const [tickets, users, loaded, announcements] = await Promise.all([
    listTickets(tenant.id),
    listTenantUsers(tenant.id),
    loadCurrentTenant(),
    listPublishedAnnouncements(),
  ]);

  const openTickets = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;

  const sections = [
    {
      href: "/support/requests",
      name: "Requests",
      desc: "File a request or question for the Prism team and track it.",
      stat: `${openTickets} open · ${tickets.length} total`,
    },
    {
      href: "/support/team",
      name: "Team",
      desc: "The people in your workspace and their roles.",
      stat: `${users.length} member${users.length === 1 ? "" : "s"}`,
    },
    {
      href: "/support/workspace",
      name: "Workspace",
      desc: "The modules turned on for your agency.",
      stat: `${loaded.modules.length} module${loaded.modules.length === 1 ? "" : "s"}`,
    },
    {
      href: "/support/announcements",
      name: "Announcements",
      desc: "Maintenance notices and advisories from the Prism team.",
      stat: `${announcements.length} posted`,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Account
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{tenant.name}</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Your account console — requests, your team, your workspace, and
        announcements. Everything here is private to {tenant.name}.
      </p>

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
    </div>
  );
}
