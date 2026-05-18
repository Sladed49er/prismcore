import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listRules, listRuns, TRIGGERS, ACTIONS } from "@/lib/automation-engine";
import {
  AutomationsPanel,
  type RuleDTO,
  type RunDTO,
} from "@/components/automations-panel";

/** Automations — a workflow rule engine that actually fires. */
export default async function AutomationsPage() {
  await requireModule("tasks");
  const { config } = await loadCurrentTenant();
  const [ruleRows, runRows] = await Promise.all([
    listRules(config.id),
    listRuns(config.id),
  ]);

  const rules: RuleDTO[] = ruleRows.map((r) => ({
    id: r.id,
    name: r.name,
    triggerEvent: r.triggerEvent,
    thresholdDays: r.thresholdDays,
    actionType: r.actionType,
    actionConfig: r.actionConfig,
    enabled: r.enabled,
    fireCount: r.fireCount,
  }));
  const runs: RunDTO[] = runRows.map((r) => ({
    id: r.id,
    ruleName: r.ruleName,
    entityType: r.entityType,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/tasks"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Tasks
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Automations</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        When/then rules that fire on their own — an expiring policy, an aging
        claim, an overdue task — and create a task or send an email. The daily
        worker evaluates every rule; &ldquo;Run rules now&rdquo; does the same
        pass on demand.
      </p>
      <AutomationsPanel
        rules={rules}
        runs={runs}
        triggers={TRIGGERS.map((t) => ({ ...t }))}
        actions={ACTIONS.map((a) => ({ ...a }))}
      />
    </div>
  );
}
