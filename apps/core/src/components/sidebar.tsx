import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { NavLinks, type NavItem } from "@/components/nav-links";

/**
 * The shell sidebar. Module nav is generated from the registry; the workspace
 * name, logo, and accent colour are the tenant's own branding. The Platform
 * Admin link shows only for platform administrators.
 */
export function Sidebar({
  workspaceName,
  logoUrl,
  accentColor,
  items,
  viewerName,
  isAdmin,
}: {
  workspaceName: string;
  logoUrl: string | null;
  accentColor: string;
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
      <div className="flex items-center gap-2.5 border-b border-gray-200 px-5 py-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-md object-contain"
          />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {workspaceName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            Prism Core
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
            {workspaceName}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks items={nav} accentColor={accentColor} />
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
