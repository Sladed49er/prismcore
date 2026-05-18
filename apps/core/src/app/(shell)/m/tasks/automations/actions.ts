"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createRule,
  updateRule,
  toggleRule,
  deleteRule,
  evaluateRules,
  type AutomationRule,
} from "@/lib/automation-engine";
import type { AutomationActionConfig } from "@prismcore/db";

const PATH = "/m/tasks/automations";

interface RuleInput {
  name: string;
  triggerEvent: string;
  thresholdDays: number;
  actionType: string;
  actionConfig: AutomationActionConfig;
}

export async function addRule(input: RuleInput): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createRule({ tenantId: tenant.id, ...input });
  revalidatePath(PATH);
}

export async function editRule(
  input: RuleInput & { id: string },
): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateRule({ tenantId: tenant.id, ...input });
  revalidatePath(PATH);
}

export async function toggle(id: string, enabled: boolean): Promise<void> {
  const tenant = await getCurrentTenant();
  await toggleRule(tenant.id, id, enabled);
  revalidatePath(PATH);
}

export async function removeRule(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteRule(tenant.id, id);
  revalidatePath(PATH);
}

/** Evaluate every rule now — the same pass the daily cron runs. */
export async function runNow(): Promise<{ ok: boolean; message: string }> {
  const tenant = await getCurrentTenant();
  const { rulesRun, fired } = await evaluateRules(tenant.id);
  revalidatePath(PATH);
  return {
    ok: true,
    message: `Evaluated ${rulesRun} rule${rulesRun === 1 ? "" : "s"} — fired ${fired} time${fired === 1 ? "" : "s"}.`,
  };
}

export type { AutomationRule };
