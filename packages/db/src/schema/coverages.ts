/** Policy coverages schema — coverage lines written on a policy. Tenant-scoped. */
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { policies } from "./policies";

export const policyCoverages = pgTable(
  "policy_coverages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    coverageType: text("coverage_type").notNull(),
    limitText: text("limit_text").notNull().default(""),
    deductibleCents: integer("deductible_cents").notNull().default(0),
    premiumCents: integer("premium_cents").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("policy_coverages_tenant_idx").on(t.tenantId),
    index("policy_coverages_policy_idx").on(t.policyId),
  ],
);

export type PolicyCoverage = typeof policyCoverages.$inferSelect;
export type NewPolicyCoverage = typeof policyCoverages.$inferInsert;
