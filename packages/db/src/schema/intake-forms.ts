/**
 * Intake forms schema — the public form builder.
 *
 *  - `intake_form_definitions` a tenant-built form: a typed field list and a
 *    public token the form is reachable by (no login).
 *  - `intake_form_submissions` one filled-in form; convertible to a lead.
 *
 * Tenant-scoped, RLS-isolated. The public form page resolves the tenant from
 * the form's token, not the workspace cookie.
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

/** One field on an intake form. */
export interface IntakeFormField {
  key: string;
  label: string;
  /** text · textarea · email · phone · number · date · select */
  type: string;
  required: boolean;
  /** Choices for a `select` field. */
  options: string[];
}

export const intakeFormDefinitions = pgTable(
  "intake_form_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** The unguessable token the public form URL carries. */
    publicToken: text("public_token").notNull(),
    /** "draft" — not reachable · "published" — live. */
    status: text("status").notNull().default("draft"),
    fields: jsonb("fields")
      .$type<IntakeFormField[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("intake_form_definitions_tenant_idx").on(t.tenantId),
    uniqueIndex("intake_form_definitions_token_uq").on(t.publicToken),
  ],
);

export const intakeFormSubmissions = pgTable(
  "intake_form_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => intakeFormDefinitions.id, { onDelete: "cascade" }),
    values: jsonb("values")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    /** "new" · "converted" (to a lead) · "archived". */
    status: text("status").notNull().default("new"),
    /** The lead created from this submission, once converted. */
    leadId: uuid("lead_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("intake_form_submissions_tenant_idx").on(t.tenantId),
    index("intake_form_submissions_form_idx").on(t.formId),
  ],
);

export type IntakeFormDefinition = typeof intakeFormDefinitions.$inferSelect;
export type IntakeFormSubmission = typeof intakeFormSubmissions.$inferSelect;
