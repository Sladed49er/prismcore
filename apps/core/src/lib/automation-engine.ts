import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  adminDb,
  tenants,
  automationRules,
  automationRuns,
  policies,
  claims,
  tasks,
  renewals,
  type AutomationRule,
  type AutomationActionConfig,
} from "@prismcore/db";
import { sendEmail, escapeHtml } from "@/lib/email";

/**
 * Automation engine — a workflow rule engine that actually fires.
 *
 * `evaluateRules` runs daily (via the automation cron). For each enabled
 * rule it finds the records matching the trigger, skips any it has already
 * fired on (the `automation_runs` log dedups), and runs the action — creating
 * a task or sending an email — logging a run per record.
 */

const DAY = 86_400_000;
/** One evaluation never fires a single rule more than this many times. */
const FIRE_CAP = 100;

// ── Catalog (for the UI) ────────────────────────────────────────────

export const TRIGGERS = [
  {
    id: "policy_expiring",
    label: "Policy expiring",
    detail: "An active policy expires within the threshold window.",
  },
  {
    id: "claim_aging",
    label: "Claim aging",
    detail: "A claim has stayed open longer than the threshold.",
  },
  {
    id: "task_overdue",
    label: "Task overdue",
    detail: "A task is past its due date by the threshold.",
  },
  {
    id: "renewal_due",
    label: "Renewal due",
    detail: "A renewal falls due within the threshold window.",
  },
] as const;

export const ACTIONS = [
  { id: "create_task", label: "Create a task" },
  { id: "send_email", label: "Send an email" },
] as const;

export type { AutomationRule };

// ── Rule CRUD ───────────────────────────────────────────────────────

export async function listRules(
  tenantId: string,
): Promise<AutomationRule[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(automationRules)
      .where(eq(automationRules.tenantId, tenantId))
      .orderBy(desc(automationRules.createdAt)),
  );
}

export async function createRule(input: {
  tenantId: string;
  name: string;
  triggerEvent: string;
  thresholdDays: number;
  actionType: string;
  actionConfig: AutomationActionConfig;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(automationRules).values(input);
  });
}

export async function updateRule(input: {
  tenantId: string;
  id: string;
  name: string;
  triggerEvent: string;
  thresholdDays: number;
  actionType: string;
  actionConfig: AutomationActionConfig;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(automationRules)
      .set({
        name: input.name,
        triggerEvent: input.triggerEvent,
        thresholdDays: input.thresholdDays,
        actionType: input.actionType,
        actionConfig: input.actionConfig,
        updatedAt: new Date(),
      })
      .where(eq(automationRules.id, input.id));
  });
}

export async function toggleRule(
  tenantId: string,
  id: string,
  enabled: boolean,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(automationRules)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(automationRules.id, id));
  });
}

export async function deleteRule(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(automationRules).where(eq(automationRules.id, id));
  });
}

export interface RunRow {
  id: string;
  ruleName: string;
  triggerEvent: string;
  entityType: string;
  summary: string;
  createdAt: Date;
}

export async function listRuns(
  tenantId: string,
  limit = 50,
): Promise<RunRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: automationRuns.id,
        ruleName: automationRules.name,
        triggerEvent: automationRuns.triggerEvent,
        entityType: automationRuns.entityType,
        summary: automationRuns.summary,
        createdAt: automationRuns.createdAt,
      })
      .from(automationRuns)
      .innerJoin(
        automationRules,
        eq(automationRules.id, automationRuns.ruleId),
      )
      .where(eq(automationRuns.tenantId, tenantId))
      .orderBy(desc(automationRuns.createdAt))
      .limit(limit);
    return rows;
  });
}

// ── The engine ──────────────────────────────────────────────────────

/** One record a trigger matched. */
interface Match {
  entityType: string;
  entityId: string;
  summary: string;
}

const isoToday = (): string => new Date().toISOString().slice(0, 10);

/** Find the records a rule's trigger currently matches. */
async function findMatches(
  tenantId: string,
  rule: AutomationRule,
): Promise<Match[]> {
  const today = isoToday();
  const horizon = new Date(Date.now() + rule.thresholdDays * DAY)
    .toISOString()
    .slice(0, 10);

  return withTenantContext(tenantId, async (tx) => {
    if (rule.triggerEvent === "policy_expiring") {
      const rows = await tx
        .select()
        .from(policies)
        .where(eq(policies.tenantId, tenantId));
      return rows
        .filter(
          (p) =>
            p.status === "active" &&
            p.expirationDate !== null &&
            p.expirationDate >= today &&
            p.expirationDate <= horizon,
        )
        .map((p) => ({
          entityType: "policy",
          entityId: p.id,
          summary: `Policy ${p.policyNumber} expires ${p.expirationDate}`,
        }));
    }

    if (rule.triggerEvent === "claim_aging") {
      const cutoff = Date.now() - rule.thresholdDays * DAY;
      const rows = await tx
        .select()
        .from(claims)
        .where(eq(claims.tenantId, tenantId));
      return rows
        .filter(
          (c) =>
            (c.status === "open" || c.status === "investigating") &&
            c.createdAt.getTime() < cutoff,
        )
        .map((c) => ({
          entityType: "claim",
          entityId: c.id,
          summary: `Claim ${c.claimNumber} has been ${c.status} over ${rule.thresholdDays} days`,
        }));
    }

    if (rule.triggerEvent === "task_overdue") {
      const overdueBy = new Date(Date.now() - rule.thresholdDays * DAY)
        .toISOString()
        .slice(0, 10);
      const rows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.tenantId, tenantId));
      return rows
        .filter(
          (t) =>
            t.status !== "done" &&
            t.dueDate !== null &&
            t.dueDate < overdueBy,
        )
        .map((t) => ({
          entityType: "task",
          entityId: t.id,
          summary: `Task "${t.title}" is overdue (due ${t.dueDate})`,
        }));
    }

    if (rule.triggerEvent === "renewal_due") {
      const rows = await tx
        .select()
        .from(renewals)
        .where(eq(renewals.tenantId, tenantId));
      return rows
        .filter(
          (r) =>
            r.dueDate !== null &&
            r.dueDate >= today &&
            r.dueDate <= horizon,
        )
        .map((r) => ({
          entityType: "renewal",
          entityId: r.id,
          summary: `A renewal is due ${r.dueDate}`,
        }));
    }

    return [] as Match[];
  });
}

export interface EvaluateResult {
  rulesRun: number;
  fired: number;
}

/**
 * Evaluate every enabled rule for a tenant and fire its action on each
 * newly-matching record. Idempotent: a rule never fires twice for the same
 * record — `automation_runs` is the dedup key.
 */
export async function evaluateRules(
  tenantId: string,
): Promise<EvaluateResult> {
  const result: EvaluateResult = { rulesRun: 0, fired: 0 };

  const rules = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.tenantId, tenantId),
          eq(automationRules.enabled, true),
        ),
      ),
  );

  for (const rule of rules) {
    result.rulesRun++;

    // Records the trigger matches now, and the ones already fired on.
    const matches = await findMatches(tenantId, rule);
    const alreadyFired = await withTenantContext(tenantId, async (tx) => {
      const prior = await tx
        .select({ entityId: automationRuns.entityId })
        .from(automationRuns)
        .where(eq(automationRuns.ruleId, rule.id));
      return new Set(prior.map((p) => p.entityId));
    });

    const fresh = matches
      .filter((m) => !alreadyFired.has(m.entityId))
      .slice(0, FIRE_CAP);
    if (fresh.length === 0) continue;

    for (const match of fresh) {
      try {
        await runAction(tenantId, rule, match);
        await withTenantContext(tenantId, async (tx) => {
          await tx.insert(automationRuns).values({
            tenantId,
            ruleId: rule.id,
            triggerEvent: rule.triggerEvent,
            entityType: match.entityType,
            entityId: match.entityId,
            summary: match.summary,
          });
        });
        result.fired++;
      } catch (error) {
        console.error(
          `[automation] rule ${rule.id} on ${match.entityId} failed:`,
          error,
        );
      }
    }

    await withTenantContext(tenantId, async (tx) => {
      await tx
        .update(automationRules)
        .set({ fireCount: rule.fireCount + fresh.length, lastFiredAt: new Date() })
        .where(eq(automationRules.id, rule.id));
    });
  }

  return result;
}

/** Run a rule's action against a matched record. */
async function runAction(
  tenantId: string,
  rule: AutomationRule,
  match: Match,
): Promise<void> {
  if (rule.actionType === "create_task") {
    const title =
      rule.actionConfig.taskTitle?.trim() || `${rule.name}`;
    await withTenantContext(tenantId, async (tx) => {
      await tx.insert(tasks).values({
        tenantId,
        title: title.slice(0, 200),
        description: match.summary,
        status: "open",
        priority: "normal",
        dueDate: isoToday(),
      });
    });
    return;
  }

  if (rule.actionType === "send_email") {
    const to = rule.actionConfig.emailTo?.trim();
    if (!to) return;
    await sendEmail({
      to,
      subject: rule.actionConfig.emailSubject?.trim() || rule.name,
      html: `<div style="font-family:system-ui,sans-serif;color:#111">
        <p><strong>${escapeHtml(rule.name)}</strong></p>
        <p>${escapeHtml(match.summary)}</p>
      </div>`,
    });
  }
}

/** Every active tenant id — for the cron to walk. Platform-level. */
export async function allTenantIds(): Promise<string[]> {
  const rows = await adminDb().select({ id: tenants.id }).from(tenants);
  return rows.map((r) => r.id);
}
