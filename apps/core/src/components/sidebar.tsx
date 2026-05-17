import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { NavLinks, type NavItem } from "@/components/nav-links";

/**
 * The shell sidebar. Module nav is generated from the registry; the Platform Admin
 * link shows only for platform administrators.
 */
export function Sidebar({
  tenantName,
  items,
  viewerName,
  isAdmin,
}: {
  tenantName: string;
  items: NavItem[];
  viewerName: string;
  isAdmin: boolean;
}) {
  const nav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "layout-dashboard" },
    ...items,
  ];

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
          Prism Core
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
          {tenantName}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks items={nav} />
      </div>

      <div className="space-y-0.5 border-t border-gray-200 p-3">
        {isAdmin ? (
          <Link
            href="/admin"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
          >
            Platform Admin
          </Link>
        ) : null}
        <Link
          href="/support"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          Support
        </Link>
        <Link
          href="/settings/customize"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          Customize
        </Link>
        <Link
          href="/compose"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          + Add modules
        </Link>
      </div>

      <div className="flex items-center gap-2 border-t border-gray-200 px-4 py-3">
        <UserButton />
        <span className="truncate text-sm text-gray-600">{viewerName}</span>
      </div>
    </aside>
  );
}
