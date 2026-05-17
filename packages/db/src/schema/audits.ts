/**
 * Premium audits schema — end-of-term premium audits (workers comp, GL, etc.).
 * Tenant-scoped. Additional/return premium = audited − estimated.
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
import { policies } from "./policies";

export const premiumAuditStatus = pgEnum("premium_audit_status", [
  "scheduled",
  "in_progress",
  "completed",
  "disputed",
]);

export const premiumAudits = pgTable(
  "premium_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    auditType: text("audit_type").notNull(),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    estimatedPremiumCents: integer("estimated_premium_cents")
      .notNull()
      .default(0),
    auditedPremiumCents: integer("audited_premium_cents")
      .notNull()
      .default(0),
    status: premiumAuditStatus("status").notNull().default("scheduled"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("premium_audits_tenant_idx").on(t.tenantId),
    index("premium_audits_policy_idx").on(t.policyId),
  ],
);

export type PremiumAudit = typeof premiumAudits.$inferSelect;
export type NewPremiumAudit = typeof premiumAudits.$inferInsert;
