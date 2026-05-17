/**
 * Saved reports — reports-as-data, like saved views but for the report
 * builder. `spec` holds the structured ReportSpec (base entity, columns,
 * joins, filters, grouping, aggregates); trusted engine code executes it.
 * Tenant-scoped and RLS-isolated like every other tenant table.
 */
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const tenantReports = pgTable(
  "tenant_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** The structured ReportSpec (see apps/core lib/reports/spec). */
    spec: jsonb("spec")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** Who built the report — a user's name, or "AI assistant". */
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tenant_reports_tenant_idx").on(t.tenantId)],
);

export type TenantReport = typeof tenantReports.$inferSelect;
export type NewTenantReport = typeof tenantReports.$inferInsert;
