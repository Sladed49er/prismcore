/**
 * Kernel schema — the tables the Prism Core kernel itself owns.
 *
 * Modules contribute their own tables (poured in Days 7-10). These three are the
 * irreducible core: who the tenants are, who the users are, and which modules each
 * tenant has turned on.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Lifecycle state of a tenant (an agency). */
export const tenantStatus = pgEnum("tenant_status", [
  "trial",
  "active",
  "suspended",
  "archived",
]);

/** Subscription tier — sets composer defaults and billing. */
export const tenantTier = pgEnum("tenant_tier", [
  "trial",
  "starter",
  "professional",
  "enterprise",
]);

/**
 * A tenant is one agency. Fully isolated: every tenant-scoped table carries a
 * `tenant_id` and is protected by PostgreSQL RLS. The `tenants` table is itself the
 * root of isolation, so it is not tenant-scoped.
 */
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  /** URL-safe handle, unique platform-wide. */
  slug: text("slug").notNull().unique(),
  /** Clerk organization id this tenant maps to. */
  clerkOrgId: text("clerk_org_id").unique(),
  /** Industry vertical — drives composer presets. */
  vertical: text("vertical").notNull().default("insurance"),
  tier: tenantTier("tier").notNull().default("trial"),
  status: tenantStatus("status").notNull().default("trial"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** A user belongs to exactly one tenant. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("users_tenant_idx").on(t.tenantId),
    uniqueIndex("users_tenant_clerk_uq").on(t.tenantId, t.clerkUserId),
  ],
);

/**
 * Per-tenant module enablement. This table REPLACES PrismAMS's hardcoded boolean
 * feature columns — modules are turned on at runtime. That runtime control is what
 * makes the composer, plugins, and the marketplace possible.
 *
 * `moduleId` matches `ModuleDefinition.id` from @prismcore/module-sdk.
 */
export const tenantModules = pgTable(
  "tenant_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    /** Free-form per-tenant module configuration. */
    config: jsonb("config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    enabledAt: timestamp("enabled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tenant_modules_tenant_idx").on(t.tenantId),
    uniqueIndex("tenant_modules_tenant_module_uq").on(t.tenantId, t.moduleId),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type TenantModule = typeof tenantModules.$inferSelect;
export type NewTenantModule = typeof tenantModules.$inferInsert;
