import type { ReactNode } from "react";
import { loadCurrentTenant } from "@/lib/kernel";
import { getViewer } from "@/lib/auth";
import { getBranding } from "@/lib/customization";
import { getBilling } from "@/lib/billing";
import { loadTerms, moduleLabel } from "@/lib/terminology";
import { Sidebar } from "@/components/sidebar";
import { SuspendedScreen } from "@/components/suspended-screen";
import type { NavItem } from "@/components/nav-links";

/**
 * The workspace shell. The sidebar is generated from the current tenant's
 * enabled modules; the signed-in user comes from Clerk. Module names and the
 * workspace branding are the tenant's own — terminology overrides and branding
 * are resolved here so every page inside the shell inherits them.
 */
export default async function ShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [{ config, modules, nav }, viewer] = await Promise.all([
    loadCurrentTenant(),
    getViewer(),
  ]);
  const [terms, branding, billing] = await Promise.all([
    loadTerms(config.id),
    getBranding(config.id),
    getBilling(config.id),
  ]);

  // Suspension gate: a tenant 30 days past due is locked out of the whole
  // shell. Platform admins bypass it so support can still investigate.
  if (billing?.status === "suspended" && !viewer?.isAdmin) {
    return (
      <SuspendedScreen workspaceName={branding?.workspaceName || config.name} />
    );
  }

  // Map each module's nav href back to its module id, so a tenant's module
  // rename (`module:<id>`) lands on the right nav entry.
  const hrefToModuleId = new Map<string, string>();
  for (const m of modules) {
    for (const n of m.nav ?? []) hrefToModuleId.set(n.href, m.id);
  }

  const items: NavItem[] = nav.map((entry) => {
    const moduleId = hrefToModuleId.get(entry.href);
    return {
      label: moduleId
        ? moduleLabel(terms, moduleId, entry.label)
        : entry.label,
      href: entry.href,
      icon: entry.icon ?? "blocks",
    };
  });

  const accentColor = branding?.accentColor ?? "#4f46e5";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        workspaceName={branding?.workspaceName || config.name}
        logoUrl={branding?.logoUrl ?? null}
        accentColor={accentColor}
        items={items}
        viewerName={viewer?.name ?? "Account"}
        isAdmin={viewer?.isAdmin ?? false}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
