/**
 * Tax timesheets schema — time entries logged against a tax engagement.
 * Tenant-scoped.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { taxEngagements } from "./tax-practice";

export const taxTimesheets = pgTable(
  "tax_timesheets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    engagementId: uuid("engagement_id")
      .notNull()
      .references(() => taxEngagements.id, { onDelete: "cascade" }),
    workDate: date("work_date"),
    /** Time logged, stored in minutes. */
    minutes: integer("minutes").notNull().default(0),
    description: text("description").notNull().default(""),
    preparerName: text("preparer_name").notNull().default(""),
    billable: boolean("billable").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tax_timesheets_tenant_idx").on(t.tenantId),
    index("tax_timesheets_engagement_idx").on(t.engagementId),
  ],
);

export type TaxTimesheet = typeof taxTimesheets.$inferSelect;
export type NewTaxTimesheet = typeof taxTimesheets.$inferInsert;
