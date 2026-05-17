/**
 * Customization-engine schema — the self-service layer.
 *
 * `tenant_custom_fields` lets a tenant add their own fields to any entity a module
 * exposes via `customizableEntities`. No code and no per-tenant schema migration —
 * the fields are just rows.
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

export type TenantCustomField = typeof tenantCustomFields.$inferSelect;
export type NewTenantCustomField = typeof tenantCustomFields.$inferInsert;
