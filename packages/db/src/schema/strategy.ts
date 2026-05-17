/**
 * Strategy-monitoring schema — metrics, their daily history, the rules that
 * watch them, and the alerts those rules fire.
 *
 *   tenant_metrics          — a named number: a scalar report spec + a target
 *   tenant_metric_snapshots — one value per metric per day (for trend rules)
 *   tenant_rules            — a condition watching a metric (threshold/target/trend)
 *   tenant_rule_alerts      — a rule that fired
 *
 * All tenant-scoped and RLS-isolated; a metric's `spec` is a ReportSpec run by
 * the trusted report engine, so no SQL is ever taken from a metric definition.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  doublePrecision,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const metricFormat = pgEnum("metric_format", [
  "money",
  "number",
  "percent",
]);
export const metricGoal = pgEnum("metric_goal", ["higher", "lower"]);
export const ruleConditionType = pgEnum("rule_condition_type", [
  "threshold",
  "target",
  "trend",
]);
export const ruleSeverity = pgEnum("rule_severity", [
  "info",
  "warning",
  "critical",
]);
export const alertStatus = pgEnum("alert_status", ["open", "acknowledged"]);

export const tenantMetrics = pgTable(
  "tenant_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** A scalar ReportSpec — base + filters + one aggregate. */
    spec: jsonb("spec")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    format: metricFormat("format").notNull().default("number"),
    /** Optional target value; money targets are in cents. */
    target: doublePrecision("target"),
    /** Whether a higher value is good — drives status colour + target rules. */
    goalDirection: metricGoal("goal_direction").notNull().default("higher"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tenant_metrics_tenant_idx").on(t.tenantId)],
);

export const tenantMetricSnapshots = pgTable(
  "tenant_metric_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    metricId: uuid("metric_id")
      .notNull()
      .references(() => tenantMetrics.id, { onDelete: "cascade" }),
    value: doublePrecision("value").notNull().default(0),
    /** The calendar day this snapshot is for — one snapshot per metric/day. */
    capturedOn: date("captured_on").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tenant_metric_snapshots_metric_idx").on(t.metricId),
    uniqueIndex("tenant_metric_snapshots_uq").on(
      t.tenantId,
      t.metricId,
      t.capturedOn,
    ),
  ],
);

export const tenantRules = pgTable(
  "tenant_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    metricId: uuid("metric_id")
      .notNull()
      .references(() => tenantMetrics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    conditionType: ruleConditionType("condition_type").notNull(),
    /** threshold: gt|lt|gte|lte · trend: drop|rise · target: unused. */
    comparator: text("comparator").notNull().default(""),
    /** threshold: the compared value · trend: the percent · target: unused. */
    threshold: doublePrecision("threshold").notNull().default(0),
    /** trend: how many days back to compare against. */
    windowDays: integer("window_days").notNull().default(0),
    severity: ruleSeverity("severity").notNull().default("warning"),
    enabled: boolean("enabled").notNull().default(true),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tenant_rules_tenant_idx").on(t.tenantId)],
);

export const tenantRuleAlerts = pgTable(
  "tenant_rule_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => tenantRules.id, { onDelete: "cascade" }),
    metricId: uuid("metric_id")
      .notNull()
      .references(() => tenantMetrics.id, { onDelete: "cascade" }),
    severity: ruleSeverity("severity").notNull(),
    /** Human-readable description of what fired. */
    message: text("message").notNull(),
    /** The metric value when the rule fired. */
    value: doublePrecision("value").notNull().default(0),
    status: alertStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  },
  (t) => [
    index("tenant_rule_alerts_tenant_idx").on(t.tenantId),
    index("tenant_rule_alerts_rule_idx").on(t.ruleId),
  ],
);

export type TenantMetric = typeof tenantMetrics.$inferSelect;
export type TenantMetricSnapshot = typeof tenantMetricSnapshots.$inferSelect;
export type TenantRule = typeof tenantRules.$inferSelect;
export type TenantRuleAlert = typeof tenantRuleAlerts.$inferSelect;
