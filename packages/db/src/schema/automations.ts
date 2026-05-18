/**
 * Automations schema — the workflow rule engine.
 *
 * An `automation_rules` row is a when/then rule: a trigger (a state the daily
 * evaluator looks for — an expiring policy, an aging claim, an overdue task)
 * and an action (create a task, send an email). `automation_runs` logs every
 * time a rule fired against a specific record, which also dedups — a rule
 * never fires twice for the same record. Tenant-scoped, RLS-isolated.
 *
 * This is what PrismAMS and CallIntel never had: rules that actually fire.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

/** The configurable side of an action. */
export interface AutomationActionConfig {
  taskTitle?: string;
  emailTo?: string;
  emailSubject?: string;
}

export const automationRules = pgTable(
  "automation_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** policy_expiring · claim_aging · task_overdue · renewal_due */
    triggerEvent: text("trigger_event").notNull(),
    /** The day window the trigger uses (e.g. "expiring within 30 days"). */
    thresholdDays: integer("threshold_days").notNull().default(30),
    /** create_task · send_email */
    actionType: text("action_type").notNull(),
    actionConfig: jsonb("action_config")
      .$type<AutomationActionConfig>()
      .notNull()
      .default({}),
    enabled: boolean("enabled").notNull().default(true),
    fireCount: integer("fire_count").notNull().default(0),
    lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("automation_rules_tenant_idx").on(t.tenantId)],
);

export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => automationRules.id, { onDelete: "cascade" }),
    triggerEvent: text("trigger_event").notNull(),
    /** The kind of record that fired the rule, e.g. "policy". */
    entityType: text("entity_type").notNull().default(""),
    /** The record id — together with ruleId this dedups firing. */
    entityId: text("entity_id").notNull().default(""),
    summary: text("summary").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("automation_runs_tenant_idx").on(t.tenantId),
    index("automation_runs_rule_idx").on(t.ruleId),
  ],
);

export type AutomationRule = typeof automationRules.$inferSelect;
export type AutomationRun = typeof automationRuns.$inferSelect;
