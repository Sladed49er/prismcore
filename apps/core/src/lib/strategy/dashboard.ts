import type { ReportSpec } from "@/lib/reports/spec";
import {
  listMetrics,
  listRules,
  listAlerts,
  snapshotOnOrBefore,
  type MetricFormat,
  type MetricGoal,
  type RuleConditionType,
  type RuleSeverity,
} from "@/lib/strategy/store";
import { computeMetric } from "@/lib/strategy/engine";

/**
 * Assembles the live strategy dashboard: every metric's current value, its
 * 30-day trend, and its status, plus the rules and open alerts. The current
 * values are computed live (one report query per metric); trend reads the
 * snapshot history.
 */

export type MetricStatus = "on_track" | "at_risk" | "breached";

export interface MetricCard {
  id: string;
  name: string;
  description: string | null;
  format: MetricFormat;
  target: number | null;
  goalDirection: MetricGoal;
  spec: ReportSpec;
  current: number;
  /** Percent change over the trend window, or null with too little history. */
  trendPct: number | null;
  trendDays: number;
  status: MetricStatus;
}

export interface RuleRow {
  id: string;
  metricId: string;
  metricName: string;
  name: string;
  conditionType: RuleConditionType;
  comparator: string;
  threshold: number;
  windowDays: number;
  severity: RuleSeverity;
  enabled: boolean;
}

export interface AlertRow {
  id: string;
  ruleId: string;
  metricId: string;
  severity: RuleSeverity;
  message: string;
  value: number;
  createdAt: string;
}

export interface StrategyDashboardData {
  metrics: MetricCard[];
  rules: RuleRow[];
  alerts: AlertRow[];
}

const TREND_DAYS = 30;

export async function loadStrategyDashboard(
  tenantId: string,
): Promise<StrategyDashboardData> {
  const [metrics, rules, openAlerts] = await Promise.all([
    listMetrics(tenantId),
    listRules(tenantId),
    listAlerts(tenantId, { status: "open" }),
  ]);

  const breachedMetricIds = new Set(openAlerts.map((a) => a.metricId));
  const metricName = new Map(metrics.map((m) => [m.id, m.name]));
  const trendBaseline = new Date(Date.now() - TREND_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const cards: MetricCard[] = [];
  for (const m of metrics) {
    let current = 0;
    try {
      current = await computeMetric(tenantId, m.spec);
    } catch (error) {
      console.error(`[strategy] metric ${m.id} failed to compute:`, error);
    }

    const baseline = await snapshotOnOrBefore(tenantId, m.id, trendBaseline);
    const trendPct =
      baseline && baseline.value !== 0
        ? ((current - baseline.value) / Math.abs(baseline.value)) * 100
        : null;

    let status: MetricStatus = "on_track";
    if (breachedMetricIds.has(m.id)) {
      status = "breached";
    } else if (m.target != null) {
      const missing =
        m.goalDirection === "higher"
          ? current < m.target
          : current > m.target;
      if (missing) status = "at_risk";
    }

    cards.push({
      id: m.id,
      name: m.name,
      description: m.description,
      format: m.format,
      target: m.target,
      goalDirection: m.goalDirection,
      spec: m.spec,
      current,
      trendPct,
      trendDays: TREND_DAYS,
      status,
    });
  }

  return {
    metrics: cards,
    rules: rules.map((r) => ({
      id: r.id,
      metricId: r.metricId,
      metricName: metricName.get(r.metricId) ?? "(deleted metric)",
      name: r.name,
      conditionType: r.conditionType,
      comparator: r.comparator,
      threshold: r.threshold,
      windowDays: r.windowDays,
      severity: r.severity,
      enabled: r.enabled,
    })),
    alerts: openAlerts.map((a) => ({
      id: a.id,
      ruleId: a.ruleId,
      metricId: a.metricId,
      severity: a.severity,
      message: a.message,
      value: a.value,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
