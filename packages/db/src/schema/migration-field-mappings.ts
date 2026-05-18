/**
 * Migration field mappings schema — the source-field → target-field map for a
 * migration job, the detail behind a legacy-system data import. Tenant-scoped.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { migrationJobs } from "./migration";

export const fieldMappingStatus = pgEnum("field_mapping_status", [
  "mapped",
  "needs_review",
  "skipped",
]);

export const migrationFieldMappings = pgTable(
  "migration_field_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => migrationJobs.id, { onDelete: "cascade" }),
    sourceField: text("source_field").notNull(),
    targetField: text("target_field").notNull().default(""),
    /** Notes on any transformation applied between source and target. */
    transform: text("transform").notNull().default(""),
    status: fieldMappingStatus("status").notNull().default("mapped"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("migration_field_mappings_tenant_idx").on(t.tenantId),
    index("migration_field_mappings_job_idx").on(t.jobId),
  ],
);

export type MigrationFieldMapping =
  typeof migrationFieldMappings.$inferSelect;
export type NewMigrationFieldMapping =
  typeof migrationFieldMappings.$inferInsert;
