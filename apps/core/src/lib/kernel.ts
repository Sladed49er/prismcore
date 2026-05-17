import { notFound } from "next/navigation";
import type { ModuleDefinition, NavEntry } from "@prismcore/module-sdk";
import { getRegistry } from "@/lib/registry";
import { getCurrentTenant } from "@/lib/current-tenant";
import type { TenantConfig } from "@/lib/tenant";

/** A tenant resolved against the registry: its modules (in load order) and its nav. */
export interface LoadedTenant {
  config: TenantConfig;
  modules: ModuleDefinition[];
  nav: NavEntry[];
}

/**
 * The kernel runtime loader.
 *
 * Given a tenant's enabled module ids, the registry expands dependencies, sorts
 * them into load order, and builds the navigation tree. The kernel never hardcodes
 * a module — it only ever asks the registry. That is the whole design.
 */
export function loadTenant(config: TenantConfig): LoadedTenant {
  const registry = getRegistry();
  return {
    config,
    modules: registry.resolveForTenant(config.enabledModuleIds),
    nav: registry.navFor(config.enabledModuleIds),
  };
}

/** Load the tenant for the current request. */
export async function loadCurrentTenant(): Promise<LoadedTenant> {
  return loadTenant(await getCurrentTenant());
}

/**
 * Route guard. Renders a 404 unless the current tenant has `moduleId` enabled —
 * this is route-to-module gating enforced at the page level.
 */
export async function requireModule(moduleId: string): Promise<void> {
  const { modules } = await loadCurrentTenant();
  if (!modules.some((m) => m.id === moduleId)) notFound();
}
