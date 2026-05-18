/**
 * Migration schema — tracks data-import jobs when an agency moves onto Prism
 * Core from a legacy AMS (AMS360, Applied Epic, EZLynx, HawkSoft, etc.).
 *
 * Each row is one import job for one entity type from one source system, with
 * expected / imported / failed counts so onboarding progress is visible.
 * Tenant-scoped.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const migrationStatus = pgEnum("migration_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
]);

export const migrationJobs = pgTable(
  "migration_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Legacy system the data is coming from, e.g. "AMS360". */
    sourceSystem: text("source_system").notNull().default(""),
    /** What is being imported — clients, policies, claims, documents, etc. */
    entityType: text("entity_type").notNull().default(""),
    status: migrationStatus("status").notNull().default("pending"),
    recordsExpected: integer("records_expected").notNull().default(0),
    recordsImported: integer("records_imported").notNull().default(0),
    recordsFailed: integer("records_failed").notNull().default(0),
    notes: text("notes").notNull().default(""),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("migration_jobs_tenant_idx").on(t.tenantId)],
);

export type MigrationJob = typeof migrationJobs.$inferSelect;
export type NewMigrationJob = typeof migrationJobs.$inferInsert;
