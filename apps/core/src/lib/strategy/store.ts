import { and, desc, eq, lte } from "drizzle-orm";
import {
  withTenantContext,
  tenantMetrics,
  tenantMetricSnapshots,
  tenantRules,
  tenantRuleAlerts,
  type TenantMetric,
  type TenantMetricSnapshot,
  type TenantRule,
  type TenantRuleAlert,
} from "@prismcore/db";
import type { ReportSpec } from "@/lib/reports/spec";

/**
 * Strategy storage — metrics, their daily snapshots, the rules that watch
 * them, and the alerts those rules fire. Every call is RLS-scoped via
 * `withTenantContext`.
 */

export type MetricFormat = "money" | "number" | "percent";
export type MetricGoal = "higher" | "lower";
export type RuleConditionType = "threshold" | "target" | "trend";
export type RuleSeverity = "info" | "warning" | "critical";

export interface Metric {
  id: string;
  name: string;
  description: string | null;
  spec: ReportSpec;
  format: MetricFormat;
  target: number | null;
  goalDirection: MetricGoal;
  updatedAt: Date;
}

function toMetric(row: TenantMetric): Metric {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    spec: row.spec as unknown as ReportSpec,
    format: row.format,
    target: row.target,
    goalDirection: row.goalDirection,
    updatedAt: row.updatedAt,
  };
}

/* ── Metrics ─────────────────────────────────────────────────────────────── */

export async function listMetrics(tenantId: string): Promise<Metric[]> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantMetrics)
      .where(eq(tenantMetrics.tenantId, tenantId))
      .orderBy(desc(tenantMetrics.updatedAt)),
  );
  return rows.map(toMetric);
}

export async function getMetric(
  tenantId: string,
  id: string,
): Promise<Metric | null> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantMetrics)
      .where(and(eq(tenantMetrics.tenantId, tenantId), eq(tenantMetrics.id, id)))
      .limit(1),
  );
  return rows[0] ? toMetric(rows[0]) : null;
}

export async function saveMetric(
  tenantId: string,
  input: {
    id?: string;
    name: string;
    description?: string | null;
    spec: ReportSpec;
    format: MetricFormat;
    target?: number | null;
    goalDirection: MetricGoal;
    createdBy?: string;
  },
): Promise<string> {
  const spec = input.spec as unknown as Record<string, unknown>;
  return withTenantContext(tenantId, async (tx) => {
    if (input.id) {
      await tx
        .update(tenantMetrics)
        .set({
          name: input.name,
          description: input.description ?? null,
          spec,
          format: input.format,
          target: input.target ?? null,
          goalDirection: input.goalDirection,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tenantMetrics.tenantId, tenantId),
            eq(tenantMetrics.id, input.id),
          ),
        );
      return input.id;
    }
    const [row] = await tx
      .insert(tenantMetrics)
      .values({
        tenantId,
        name: input.name,
        description: input.description ?? null,
        spec,
        format: input.format,
        target: input.target ?? null,
        goalDirection: input.goalDirection,
        createdBy: input.createdBy ?? null,
      })
      .returning({ id: tenantMetrics.id });
    return row?.id ?? "";
  });
}

export async function deleteMetric(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(tenantMetrics)
      .where(
        and(eq(tenantMetrics.tenantId, tenantId), eq(tenantMetrics.id, id)),
      );
  });
}

/* ── Snapshots ───────────────────────────────────────────────────────────── */

/** Upsert today's (or a given day's) value for a metric. */
export async function recordSnapshot(
  tenantId: string,
  input: { metricId: string; value: number; capturedOn: string },
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .insert(tenantMetricSnapshots)
      .values({
        tenantId,
        metricId: input.metricId,
        value: input.value,
        capturedOn: input.capturedOn,
      })
      .onConflictDoUpdate({
        target: [
          tenantMetricSnapshots.tenantId,
          tenantMetricSnapshots.metricId,
          tenantMetricSnapshots.capturedOn,
        ],
        set: { value: input.value, capturedAt: new Date() },
      });
  });
}

export async function listSnapshots(
  tenantId: string,
  metricId: string,
  limit = 90,
): Promise<TenantMetricSnapshot[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantMetricSnapshots)
      .where(
        and(
          eq(tenantMetricSnapshots.tenantId, tenantId),
          eq(tenantMetricSnapshots.metricId, metricId),
        ),
      )
      .orderBy(desc(tenantMetricSnapshots.capturedOn))
      .limit(limit),
  );
}

/** The most recent snapshot on or before `onOrBefore` (YYYY-MM-DD) — the
 *  trend baseline. Null when there is no history that far back. */
export async function snapshotOnOrBefore(
  tenantId: string,
  metricId: string,
  onOrBefore: string,
): Promise<TenantMetricSnapshot | null> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantMetricSnapshots)
      .where(
        and(
          eq(tenantMetricSnapshots.tenantId, tenantId),
          eq(tenantMetricSnapshots.metricId, metricId),
          lte(tenantMetricSnapshots.capturedOn, onOrBefore),
        ),
      )
      .orderBy(desc(tenantMetricSnapshots.capturedOn))
      .limit(1),
  );
  return rows[0] ?? null;
}

/* ── Rules ───────────────────────────────────────────────────────────────── */

export async function listRules(tenantId: string): Promise<TenantRule[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantRules)
      .where(eq(tenantRules.tenantId, tenantId))
      .orderBy(desc(tenantRules.updatedAt)),
  );
}

export async function saveRule(
  tenantId: string,
  input: {
    id?: string;
    metricId: string;
    name: string;
    conditionType: RuleConditionType;
    comparator: string;
    threshold: number;
    windowDays: number;
    severity: RuleSeverity;
    enabled: boolean;
    createdBy?: string;
  },
): Promise<string> {
  return withTenantContext(tenantId, async (tx) => {
    if (input.id) {
      await tx
        .update(tenantRules)
        .set({
          metricId: input.metricId,
          name: input.name,
          conditionType: input.conditionType,
          comparator: input.comparator,
          threshold: input.threshold,
          windowDays: input.windowDays,
          severity: input.severity,
          enabled: input.enabled,
          updatedAt: new Date(),
        })
        .where(
          and(eq(tenantRules.tenantId, tenantId), eq(tenantRules.id, input.id)),
        );
      return input.id;
    }
    const [row] = await tx
      .insert(tenantRules)
      .values({
        tenantId,
        metricId: input.metricId,
        name: input.name,
        conditionType: input.conditionType,
        comparator: input.comparator,
        threshold: input.threshold,
        windowDays: input.windowDays,
        severity: input.severity,
        enabled: input.enabled,
        createdBy: input.createdBy ?? null,
      })
      .returning({ id: tenantRules.id });
    return row?.id ?? "";
  });
}

export async function deleteRule(tenantId: string, id: string): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(tenantRules)
      .where(and(eq(tenantRules.tenantId, tenantId), eq(tenantRules.id, id)));
  });
}

/* ── Alerts ──────────────────────────────────────────────────────────────── */

export async function listAlerts(
  tenantId: string,
  opts: { status?: "open" | "acknowledged"; limit?: number } = {},
): Promise<TenantRuleAlert[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantRuleAlerts)
      .where(
        opts.status
          ? and(
              eq(tenantRuleAlerts.tenantId, tenantId),
              eq(tenantRuleAlerts.status, opts.status),
            )
          : eq(tenantRuleAlerts.tenantId, tenantId),
      )
      .orderBy(desc(tenantRuleAlerts.createdAt))
      .limit(opts.limit ?? 100),
  );
}

/** Rule ids that already have an open alert — so a still-firing rule does not
 *  pile up duplicate alerts each evaluation. */
export async function openAlertRuleIds(
  tenantId: string,
): Promise<Set<string>> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select({ ruleId: tenantRuleAlerts.ruleId })
      .from(tenantRuleAlerts)
      .where(
        and(
          eq(tenantRuleAlerts.tenantId, tenantId),
          eq(tenantRuleAlerts.status, "open"),
        ),
      ),
  );
  return new Set(rows.map((r) => r.ruleId));
}

export async function createAlert(
  tenantId: string,
  input: {
    ruleId: string;
    metricId: string;
    severity: RuleSeverity;
    message: string;
    value: number;
  },
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.insert(tenantRuleAlerts).values({
      tenantId,
      ruleId: input.ruleId,
      metricId: input.metricId,
      severity: input.severity,
      message: input.message,
      value: input.value,
    });
  });
}

export async function acknowledgeAlert(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(tenantRuleAlerts)
      .set({ status: "acknowledged", acknowledgedAt: new Date() })
      .where(
        and(
          eq(tenantRuleAlerts.tenantId, tenantId),
          eq(tenantRuleAlerts.id, id),
        ),
      );
  });
}
