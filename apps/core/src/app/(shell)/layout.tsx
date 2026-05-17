import type { ReactNode } from "react";
import { loadCurrentTenant } from "@/lib/kernel";
import { getViewer } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import type { NavItem } from "@/components/nav-links";

/**
 * The workspace shell. The sidebar is generated from the current tenant's enabled
 * modules; the signed-in user (and whether they are a platform admin) comes from
 * Clerk.
 */
export default async function ShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [{ config, nav }, viewer] = await Promise.all([
    loadCurrentTenant(),
    getViewer(),
  ]);

  const items: NavItem[] = nav.map((entry) => ({
    label: entry.label,
    href: entry.href,
    icon: entry.icon ?? "blocks",
  }));

  return (
    <div className="flex min-h-screen">
      <Sidebar
        tenantName={config.name}
        items={items}
        viewerName={viewer?.name ?? "Account"}
        isAdmin={viewer?.isAdmin ?? false}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
