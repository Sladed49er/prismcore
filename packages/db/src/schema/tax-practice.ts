/**
 * Tax practice schema — tax-preparation engagements: one row per return a
 * practice is engaged to prepare. Tenant-scoped.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const taxEngagementType = pgEnum("tax_engagement_type", [
  "form_1040", // individual
  "form_1120", // C-corp
  "form_1120s", // S-corp
  "form_1065", // partnership
  "form_990", // nonprofit
  "other",
]);

export const taxEngagementStatus = pgEnum("tax_engagement_status", [
  "not_started",
  "in_progress",
  "in_review",
  "filed",
  "extended",
]);

export const taxEngagements = pgTable(
  "tax_engagements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientName: text("client_name").notNull(),
    taxYear: integer("tax_year").notNull(),
    engagementType: taxEngagementType("engagement_type")
      .notNull()
      .default("form_1040"),
    status: taxEngagementStatus("status").notNull().default("not_started"),
    dueDate: date("due_date"),
    feeCents: integer("fee_cents").notNull().default(0),
    preparerName: text("preparer_name").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tax_engagements_tenant_idx").on(t.tenantId)],
);

export type TaxEngagement = typeof taxEngagements.$inferSelect;
export type NewTaxEngagement = typeof taxEngagements.$inferInsert;
