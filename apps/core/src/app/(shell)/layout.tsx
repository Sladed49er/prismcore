import type { ReactNode } from "react";
import { loadCurrentTenant } from "@/lib/kernel";
import { Sidebar } from "@/components/sidebar";
import type { NavItem } from "@/components/nav-links";

/**
 * The workspace shell. The sidebar is generated from the current tenant's enabled
 * modules — add a module to the tenant and its nav appears, with no shell changes.
 */
export default async function ShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { config, nav } = await loadCurrentTenant();
  const items: NavItem[] = nav.map((entry) => ({
    label: entry.label,
    href: entry.href,
    icon: entry.icon ?? "blocks",
  }));

  return (
    <div className="flex min-h-screen">
      <Sidebar tenantName={config.name} items={items} />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
