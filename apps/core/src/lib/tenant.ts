/** Tenant types for the kernel. */

/** Cookie that carries the current workspace until a real DB is wired (Days 7-10). */
export const WORKSPACE_COOKIE = "prismcore_ws";

/** A tenant's runtime configuration — who they are and what modules they run. */
export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  /** Module ids this tenant has enabled. Dependencies resolved by the registry. */
  enabledModuleIds: string[];
}

/** Fallback workspace shown before anyone composes one. */
export const DEMO_TENANT: TenantConfig = {
  id: "demo",
  name: "Demo Agency",
  slug: "demo",
  enabledModuleIds: [
    "clients",
    "policies",
    "documents",
    "tasks",
    "renewals",
    "carriers",
    "accounting",
    "reports",
    "telephony",
    "api_clearinghouse",
  ],
};

/** A serializable module summary safe to hand to client components (the composer). */
export interface ComposableModule {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  dependsOn: string[];
  priceCents: number | null;
  priceUnit: string | null;
}
