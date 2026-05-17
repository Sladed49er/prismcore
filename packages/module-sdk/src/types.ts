/**
 * The Prism Core module contract.
 *
 * A module is a self-contained, composable unit of product capability (Clients,
 * Policies, Documents, Telephony, ...). The kernel knows nothing about any specific
 * module — it only knows this contract. That decoupling is what makes the composer,
 * runtime enable/disable, plugins, and the marketplace possible.
 */

/** Top-level grouping used by the composer and billing. */
export type ModuleCategory =
  | "core"
  | "insurance"
  | "accounting"
  | "communications"
  | "wealth"
  | "association"
  | "integration";

/** A navigation entry contributed by a module to the shell sidebar. */
export interface NavEntry {
  label: string;
  href: string;
  /** lucide-react icon name. */
  icon?: string;
  children?: NavEntry[];
  /** Lower sorts first. Defaults to 0. */
  order?: number;
}

/** A permission a module declares; consumed by RBAC. */
export interface PermissionDef {
  /** Dotted key, e.g. "clients.read". */
  key: string;
  label: string;
  description?: string;
}

/** How a module is billed. */
export type BillingUnit = "per_user" | "per_tenant" | "usage";

export interface ModulePricing {
  unit: BillingUnit;
  /** Price in USD cents. */
  priceCents: number;
  /** One-liner shown in the composer. */
  blurb?: string;
}

/**
 * An entity a module owns that the self-service customization engine may extend.
 * This is how a tenant adds custom fields / forms / workflows without code.
 */
export interface CustomizableEntity {
  /** Stable key, e.g. "client". */
  key: string;
  label: string;
  supportsCustomFields?: boolean;
  supportsCustomForms?: boolean;
  supportsWorkflows?: boolean;
}

/** Context passed to a module's tenant lifecycle hooks. */
export interface TenantLifecycleContext {
  tenantId: string;
  moduleId: string;
}

/**
 * The definition of a single module. Authored with `defineModule()` for inference,
 * then handed to the `ModuleRegistry`.
 */
export interface ModuleDefinition {
  /** Stable, URL-safe id. Matches `tenant_modules.module_id`. */
  id: string;
  name: string;
  description: string;
  version: string;
  category: ModuleCategory;
  /** lucide-react icon name. */
  icon: string;
  /** Module ids that must be enabled for this module to function. */
  dependsOn?: string[];
  /** Whether this module appears as a pickable option in the composer onboarding. */
  composable?: boolean;
  /** Navigation contributed to the shell. */
  nav?: NavEntry[];
  /** Route prefixes this module owns — used to gate routes to enabled modules. */
  routes?: string[];
  /** Permissions this module declares. */
  permissions?: PermissionDef[];
  /** Entities exposed to the self-service customization engine. */
  customizableEntities?: CustomizableEntity[];
  /**
   * Lazily-loaded tRPC router for this module. Loaded only when the module is
   * enabled for the current tenant — keeps disabled modules out of the bundle.
   * Typed as `unknown` so the SDK stays free of a tRPC dependency.
   */
  loadRouter?: () => Promise<unknown>;
  /** Drizzle table objects this module contributes to the shared schema. */
  schema?: Record<string, unknown>;
  /** Billing metadata for the composer and Stripe. */
  pricing?: ModulePricing;
  /** Runs when the module is enabled for a tenant (seed data, provisioning). */
  onTenantEnable?: (ctx: TenantLifecycleContext) => Promise<void>;
  /** Runs when the module is disabled for a tenant (cleanup, archival). */
  onTenantDisable?: (ctx: TenantLifecycleContext) => Promise<void>;
}
