import Link from "next/link";
import { NavLinks, type NavItem } from "@/components/nav-links";

/**
 * The shell sidebar. Every entry below "Dashboard" is contributed by a module via
 * its `nav` — this component is generated, not hand-maintained.
 */
export function Sidebar({
  tenantName,
  items,
}: {
  tenantName: string;
  items: NavItem[];
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
      <div className="border-t border-gray-200 p-3">
        <Link
          href="/compose"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          + Add modules
        </Link>
      </div>
    </aside>
  );
}
