/**
 * Call intelligence schema — the AI layer over PrismVoice calls, ported from
 * CallIntel. Tenant-scoped, RLS-isolated.
 *
 *  - `call_insights`   revenue-intelligence findings on a call: cross-sell
 *                      openings, renewal risk, and follow-ups that need a task.
 *  - `compliance_flags` E&O compliance concerns the watchdog flagged on a call.
 *  - `call_digests`    a stored weekly digest — the gathered call data plus the
 *                      AI narrative, kept so the history is browsable.
 *
 * Risk-radar assessments are computed on demand from the call log, not stored.
 */
import {
  pgTable,
  uuid,
  text,
  date,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { calls } from "./voip";

export const callInsights = pgTable(
  "call_insights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    callId: uuid("call_id").references(() => calls.id, {
      onDelete: "set null",
    }),
    /** "cross_sell" · "renewal_risk" · "follow_up". */
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    /** "low" · "medium" · "high" · "urgent". */
    priority: text("priority").notNull().default("medium"),
    /** Cross-sell only — rough annual premium, e.g. "$800/yr". */
    estimatedValue: text("estimated_value").notNull().default(""),
    /** Cross-sell only — auto / home / umbrella / life / etc. */
    productType: text("product_type").notNull().default(""),
    /** Follow-up only — when the task is due. */
    dueDate: date("due_date"),
    contactName: text("contact_name").notNull().default(""),
    /** "open" · "actioned" · "dismissed". */
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("call_insights_tenant_idx").on(t.tenantId),
    index("call_insights_call_idx").on(t.callId),
  ],
);

export const complianceFlags = pgTable(
  "compliance_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    callId: uuid("call_id").references(() => calls.id, {
      onDelete: "set null",
    }),
    /** "missed_disclosure" · "overpromise" · "documentation_gap" · "regulatory_concern". */
    category: text("category").notNull(),
    /** "low" · "medium" · "high" · "critical". */
    severity: text("severity").notNull().default("medium"),
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    regulation: text("regulation").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
    /** "open" · "resolved". */
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("compliance_flags_tenant_idx").on(t.tenantId),
    index("compliance_flags_call_idx").on(t.callId),
  ],
);

export const callDigests = pgTable(
  "call_digests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    /** The gathered call metrics — a {@link WeeklyDigestData}-shaped object. */
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    /** The AI narrative — headlines, coaching, staffing, after-hours. */
    insights: jsonb("insights")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("call_digests_tenant_idx").on(t.tenantId)],
);

export type CallInsight = typeof callInsights.$inferSelect;
export type ComplianceFlag = typeof complianceFlags.$inferSelect;
export type CallDigest = typeof callDigests.$inferSelect;
