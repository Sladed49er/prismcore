/** ACORD forms schema — ACORD form preparation. Tenant-scoped, RLS-isolated. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { clients } from "./clients";

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
    formType: text("form_type").notNull(),
    status: acordStatus("status").notNull().default("draft"),
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
