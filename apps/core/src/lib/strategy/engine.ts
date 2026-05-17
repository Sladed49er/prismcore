import type { TenantRule } from "@prismcore/db";
import { runReport } from "@/lib/reports/engine";
import type { ReportSpec } from "@/lib/reports/spec";
import {
  listMetrics,
  getMetric,
  listRules,
  recordSnapshot,
  snapshotOnOrBefore,
  openAlertRuleIds,
  createAlert,
  type Metric,
  type MetricFormat,
} from "@/lib/strategy/store";

/**
 * The strategy engine — computes metrics, snapshots them daily, and evaluates
 * the rules that watch them. A metric is a scalar ReportSpec, so it runs
 * through the trusted, RLS-bound report engine; nothing here executes SQL of
 * its own.
 */

/** Today as YYYY-MM-DD. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/** Run a metric's spec and return its single scalar value. */
export async function computeMetric(
  tenantId: string,
  spec: ReportSpec,
): Promise<number> {
  const result = await runReport(tenantId, spec);
  const col = result.columns[0];
  if (!col) return 0;
  const raw = result.rows[0]?.[col.key];
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Render a metric value for a human, by its format. */
export function formatMetricValue(
  value: number,
  format: MetricFormat,
): string {
  if (format === "money") {
    return `$${(value / 100).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  if (format === "percent") return `${value.toLocaleString()}%`;
  return value.toLocaleString();
}

/** Capture today's value for every metric in the tenant. Idempotent per day. */
export async function snapshotAllMetrics(
  tenantId: string,
): Promise<{ captured: number }> {
  const metrics = await listMetrics(tenantId);
  const day = today();
  let captured = 0;
  for (const metric of metrics) {
    try {
      const value = await computeMetric(tenantId, metric.spec);
      await recordSnapshot(tenantId, { metricId: metric.id, value, capturedOn: day });
      captured++;
    } catch (error) {
      console.error(`[strategy] snapshot failed for metric ${metric.id}:`, error);
    }
  }
  return { captured };
}

interface RuleVerdict {
  firing: boolean;
  /** Human-readable reason, when firing. */
  reason: string;
}

/** Evaluate one rule against a freshly computed metric value. */
async function evaluateRule(
  tenantId: string,
  rule: TenantRule,
  metric: Metric,
  current: number,
): Promise<RuleVerdict> {
  const shown = formatMetricValue(current, metric.format);

  if (rule.conditionType === "threshold") {
    const t = rule.threshold;
    const limit = formatMetricValue(t, metric.format);
    const hit =
      (rule.comparator === "gt" && current > t) ||
      (rule.comparator === "lt" && current < t) ||
      (rule.comparator === "gte" && current >= t) ||
      (rule.comparator === "lte" && current <= t);
    const word =
      rule.comparator === "gt" || rule.comparator === "gte"
        ? "above"
        : "below";
    return {
      firing: hit,
      reason: `${metric.name} is ${shown} — ${word} the ${limit} threshold.`,
    };
  }

  if (rule.conditionType === "target") {
    if (metric.target == null) return { firing: false, reason: "" };
    const missed =
      metric.goalDirection === "higher"
        ? current < metric.target
        : current > metric.target;
    const target = formatMetricValue(metric.target, metric.format);
    return {
      firing: missed,
      reason: `${metric.name} is ${shown}, ${
        metric.goalDirection === "higher" ? "short of" : "over"
      } the ${target} target.`,
    };
  }

  // trend: compare to the baseline snapshot ~windowDays ago.
  const baseline = await snapshotOnOrBefore(
    tenantId,
    rule.metricId,
    daysAgo(rule.windowDays),
  );
  if (!baseline || baseline.value === 0) {
    return { firing: false, reason: "" };
  }
  const pct = ((current - baseline.value) / Math.abs(baseline.value)) * 100;
  const dropped = rule.comparator === "drop" && pct <= -rule.threshold;
  const rose = rule.comparator === "rise" && pct >= rule.threshold;
  const move = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  return {
    firing: dropped || rose,
    reason: `${metric.name} moved ${move} over ${rule.windowDays} days — now ${shown}.`,
  };
}

/** A freshly-raised alert — enough for the cron to notify on it. */
export interface RaisedAlert {
  ruleId: string;
  metricName: string;
  severity: string;
  message: string;
}

/**
 * Evaluate every enabled rule for a tenant. A rule that is firing and does not
 * already have an open alert raises a new one. Returns the alerts raised this
 * run, so the caller can notify on them.
 */
export async function evaluateTenantRules(
  tenantId: string,
): Promise<{ evaluated: number; raised: RaisedAlert[] }> {
  const rules = (await listRules(tenantId)).filter((r) => r.enabled);
  if (rules.length === 0) return { evaluated: 0, raised: [] };

  const alreadyOpen = await openAlertRuleIds(tenantId);
  const raised: RaisedAlert[] = [];

  for (const rule of rules) {
    try {
      const metric = await getMetric(tenantId, rule.metricId);
      if (!metric) continue;
      const current = await computeMetric(tenantId, metric.spec);
      const verdict = await evaluateRule(tenantId, rule, metric, current);
      if (verdict.firing && !alreadyOpen.has(rule.id)) {
        await createAlert(tenantId, {
          ruleId: rule.id,
          metricId: rule.metricId,
          severity: rule.severity,
          message: verdict.reason,
          value: current,
        });
        raised.push({
          ruleId: rule.id,
          metricName: metric.name,
          severity: rule.severity,
          message: verdict.reason,
        });
      }
    } catch (error) {
      console.error(`[strategy] rule ${rule.id} evaluation failed:`, error);
    }
  }

  return { evaluated: rules.length, raised };
}
