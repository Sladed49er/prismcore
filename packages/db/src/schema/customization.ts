/**
 * Customization-engine schema — the self-service layer.
 *
 * Every table here is customization-AS-DATA: a tenant reshapes its own
 * workspace by writing rows, never by forking code or running a per-tenant
 * migration. All tables carry `tenant_id` and are under RLS, so a tenant's
 * customizations are physically isolated to that tenant by Postgres itself —
 * they can never touch the shared platform or another tenant.
 *
 *   tenant_custom_fields    — extra fields on any module entity
 *   tenant_terminology      — rename modules / entities to the tenant's words
 *   tenant_option_sets      — tenant-defined picklists (+ core-status overrides)
 *   tenant_option_items     — the values inside an option set
 *   tenant_saved_views      — saved column/sort/filter layouts for a list
 *   tenant_branding         — workspace name, accent colour, logo
 *   tenant_customization_log— append-only audit of every customization change
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const customFieldType = pgEnum("custom_field_type", [
  "text",
  "number",
  "date",
  "select",
  "checkbox",
]);

export const tenantCustomFields = pgTable(
  "tenant_custom_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** The module that owns the entity, e.g. "clients". */
    moduleId: text("module_id").notNull(),
    /** Entity key the field is attached to, e.g. "client". */
    entityKey: text("entity_key").notNull(),
    /** Stable field identifier, derived from the label. */
    fieldKey: text("field_key").notNull(),
    label: text("label").notNull(),
    fieldType: customFieldType("field_type").notNull().default("text"),
    required: boolean("required").notNull().default(false),
    /** Choices for select-type fields. */
    options: jsonb("options").$type<string[]>().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /**
     * Custom fields are archived, never destroyed: a removed field keeps its
     * full definition (key, label, type) so historical record data can still
     * be identified and matched up later — in an export, a migration, or an
     * acquisition. Null = active; a timestamp = archived on that date.
     */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("tenant_custom_fields_tenant_idx").on(t.tenantId),
    uniqueIndex("tenant_custom_fields_uq").on(
      t.tenantId,
      t.entityKey,
      t.fieldKey,
    ),
  ],
);

/**
 * Terminology overrides. `term_key` namespaces what is being renamed —
 * `module:clients`, `entity:client.singular`, `entity:client.plural` — and
 * `label` is the tenant's word for it. A missing row = the platform default.
 */
export const tenantTerminology = pgTable(
  "tenant_terminology",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    termKey: text("term_key").notNull(),
    label: text("label").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tenant_terminology_tenant_idx").on(t.tenantId),
    uniqueIndex("tenant_terminology_uq").on(t.tenantId, t.termKey),
  ],
);

/**
 * A named picklist. `set_key` is the tenant's own key for a reusable set, or
 * a reserved `core:` key (e.g. `core:client.status`) — those override the
 * label / colour / order of a built-in status field without changing the
 * underlying enum value the database stores.
 */
export const tenantOptionSets = pgTable(
  "tenant_option_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    setKey: text("set_key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** True for a `core:` set that customizes a built-in status field. */
    isCoreOverride: boolean("is_core_override").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tenant_option_sets_tenant_idx").on(t.tenantId),
    uniqueIndex("tenant_option_sets_uq").on(t.tenantId, t.setKey),
  ],
);

export const tenantOptionItems = pgTable(
  "tenant_option_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    optionSetId: uuid("option_set_id")
      .notNull()
      .references(() => tenantOptionSets.id, { onDelete: "cascade" }),
    /** Stored value. For a core override this equals the built-in enum value. */
    value: text("value").notNull(),
    label: text("label").notNull(),
    /** Badge colour key, e.g. "green", "amber", "gray". */
    color: text("color").notNull().default("gray"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    index("tenant_option_items_set_idx").on(t.optionSetId),
    index("tenant_option_items_tenant_idx").on(t.tenantId),
  ],
);

/**
 * A saved list layout. `list_key` is the list it applies to ("clients",
 * "invoices", …); `config` holds the chosen columns, sort, and filters.
 */
export const tenantSavedViews = pgTable(
  "tenant_saved_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    listKey: text("list_key").notNull(),
    name: text("name").notNull(),
    config: jsonb("config")
      .$type<{
        columns?: string[];
        sortBy?: string;
        sortDir?: "asc" | "desc";
        filters?: Record<string, string>;
      }>()
      .notNull()
      .default({}),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tenant_saved_views_tenant_idx").on(t.tenantId),
    index("tenant_saved_views_list_idx").on(t.tenantId, t.listKey),
  ],
);

/** Workspace branding — exactly one row per tenant (tenant_id is the PK). */
export const tenantBranding = pgTable("tenant_branding", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** Display name for the workspace; null falls back to the tenant name. */
  workspaceName: text("workspace_name"),
  /** Hex accent colour applied across the shell. */
  accentColor: text("accent_color").notNull().default("#4f46e5"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customizationActor = pgEnum("customization_actor", [
  "user",
  "ai",
]);

/**
 * Append-only audit of every customization change — by a person or by the AI
 * assistant. `undo` carries enough to reverse the change; `reverted_at` is set
 * when it has been. This is the safeguard that keeps an autonomous AI change
 * recoverable.
 */
export const tenantCustomizationLog = pgTable(
  "tenant_customization_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    actorType: customizationActor("actor_type").notNull(),
    /** Who/what made the change — a user's name/email, or "AI assistant". */
    actorName: text("actor_name").notNull(),
    /** Machine action key, e.g. "field.add", "terminology.set". */
    action: text("action").notNull(),
    /** Human-readable one-line description of the change. */
    summary: text("summary").notNull(),
    /** What's needed to reverse the change. */
    undo: jsonb("undo").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revertedAt: timestamp("reverted_at", { withTimezone: true }),
  },
  (t) => [index("tenant_customization_log_tenant_idx").on(t.tenantId)],
);

export type TenantCustomField = typeof tenantCustomFields.$inferSelect;
export type NewTenantCustomField = typeof tenantCustomFields.$inferInsert;
export type TenantTerminology = typeof tenantTerminology.$inferSelect;
export type TenantOptionSet = typeof tenantOptionSets.$inferSelect;
export type TenantOptionItem = typeof tenantOptionItems.$inferSelect;
export type TenantSavedView = typeof tenantSavedViews.$inferSelect;
export type TenantBranding = typeof tenantBranding.$inferSelect;
export type TenantCustomizationLogRow =
  typeof tenantCustomizationLog.$inferSelect;
