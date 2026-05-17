/** Lead sources schema — the marketing channels that bring in leads. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const leadSourceType = pgEnum("lead_source_type", [
  "referral",
  "web",
  "campaign",
  "partner",
  "cold",
  "event",
  "other",
]);

export const leadSources = pgTable(
  "lead_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sourceType: leadSourceType("source_type").notNull().default("other"),
    description: text("description").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("lead_sources_tenant_idx").on(t.tenantId)],
);

export type LeadSource = typeof leadSources.$inferSelect;
export type NewLeadSource = typeof leadSources.$inferInsert;
