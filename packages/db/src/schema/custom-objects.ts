/**
 * Custom objects schema — Salesforce-style user-defined objects.
 *
 * A `custom_object_definitions` row defines a new record type: a slug, a
 * label, and a typed field list. `custom_object_records` holds the rows the
 * tenant creates against that definition, their values keyed by field key.
 * This extends the customization kernel — a tenant can model entities the
 * built-in modules don't cover. Tenant-scoped, RLS-isolated.
 */
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

/** One field on a custom object. */
export interface CustomObjectField {
  key: string;
  label: string;
  /** text · textarea · number · date · select · email · phone · url */
  type: string;
  required: boolean;
  options: string[];
}

export const customObjectDefinitions = pgTable(
  "custom_object_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** URL-safe identifier, unique per tenant. */
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    pluralLabel: text("plural_label").notNull().default(""),
    /** kebab-case lucide icon name. */
    icon: text("icon").notNull().default("box"),
    fields: jsonb("fields")
      .$type<CustomObjectField[]>()
      .notNull()
      .default([]),
    /** The field key whose value titles each record. */
    titleFieldKey: text("title_field_key").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("custom_object_definitions_tenant_idx").on(t.tenantId),
    uniqueIndex("custom_object_definitions_slug_uq").on(t.tenantId, t.slug),
  ],
);

export const customObjectRecords = pgTable(
  "custom_object_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => customObjectDefinitions.id, { onDelete: "cascade" }),
    values: jsonb("values")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("custom_object_records_tenant_idx").on(t.tenantId),
    index("custom_object_records_definition_idx").on(t.definitionId),
  ],
);

export type CustomObjectDefinition =
  typeof customObjectDefinitions.$inferSelect;
export type CustomObjectRecord = typeof customObjectRecords.$inferSelect;
