"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { currentActorName } from "@/lib/actor";
import type { ReportSpec } from "@/lib/reports/spec";
import {
  saveMetric,
  deleteMetric,
  saveRule,
  deleteRule,
  acknowledgeAlert,
  type MetricFormat,
  type MetricGoal,
  type RuleConditionType,
  type RuleSeverity,
} from "@/lib/strategy/store";
import {
  snapshotAllMetrics,
  evaluateTenantRules,
} from "@/lib/strategy/engine";

const PATH = "/m/strategy";

export async function saveMetricAction(input: {
  id?: string;
  name: string;
  description?: string;
  spec: ReportSpec;
  format: MetricFormat;
  target?: number | null;
  goalDirection: MetricGoal;
}): Promise<void> {
  const name = input.name.trim();
  if (!name) return;
  const tenant = await getCurrentTenant();
  await saveMetric(tenant.id, {
    id: input.id,
    name,
    description: input.description?.trim() || null,
    spec: input.spec,
    format: input.format,
    target: input.target ?? null,
    goalDirection: input.goalDirection,
    createdBy: await currentActorName(),
  });
  revalidatePath(PATH);
}

export async function deleteMetricAction(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteMetric(tenant.id, id);
  revalidatePath(PATH);
}

export async function saveRuleAction(input: {
  id?: string;
  metricId: string;
  name: string;
  conditionType: RuleConditionType;
  comparator: string;
  threshold: number;
  windowDays: number;
  severity: RuleSeverity;
  enabled: boolean;
}): Promise<void> {
  const name = input.name.trim();
  if (!name || !input.metricId) return;
  const tenant = await getCurrentTenant();
  await saveRule(tenant.id, {
    ...input,
    name,
    createdBy: await currentActorName(),
  });
  revalidatePath(PATH);
}

export async function deleteRuleAction(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteRule(tenant.id, id);
  revalidatePath(PATH);
}

export async function acknowledgeAlertAction(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await acknowledgeAlert(tenant.id, id);
  revalidatePath(PATH);
}

/** Snapshot every metric and evaluate every rule now — the on-demand version
 *  of the monitoring cron, so the dashboard reflects the latest immediately. */
export async function refreshStrategyAction(): Promise<void> {
  const tenant = await getCurrentTenant();
  await snapshotAllMetrics(tenant.id);
  await evaluateTenantRules(tenant.id);
  revalidatePath(PATH);
}
