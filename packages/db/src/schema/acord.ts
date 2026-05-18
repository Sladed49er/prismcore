/**
 * ACORD forms schema — ACORD form preparation. Tenant-scoped, RLS-isolated.
 *
 * `fieldValues` holds the prepared form's field map — prefilled from live
 * client/policy/carrier data, then editable.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { clients } from "./clients";
import { policies } from "./policies";

export const acordStatus = pgEnum("acord_status", [
  "draft",
  "completed",
  "submitted",
]);

export const acordForms = pgTable(
  "acord_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** The policy the form was prepared against, when applicable. */
    policyId: uuid("policy_id").references(() => policies.id, {
      onDelete: "set null",
    }),
    formType: text("form_type").notNull(),
    status: acordStatus("status").notNull().default("draft"),
    /** The prepared form's field map — prefilled, then edited. */
    fieldValues: jsonb("field_values")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("acord_forms_tenant_idx").on(t.tenantId),
    index("acord_forms_client_idx").on(t.clientId),
  ],
);

export type AcordForm = typeof acordForms.$inferSelect;
export type NewAcordForm = typeof acordForms.$inferInsert;
