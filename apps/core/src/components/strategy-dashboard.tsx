"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveMetricAction,
  deleteMetricAction,
  saveRuleAction,
  deleteRuleAction,
  acknowledgeAlertAction,
  refreshStrategyAction,
} from "@/app/(shell)/m/strategy/actions";
import { StrategyAssistantPanel } from "@/components/strategy-assistant-panel";
import {
  emptySpec,
  type ReportSpec,
  type ReportFilter,
  type ReportAggregate,
  type FilterOp,
  type AggFn,
} from "@/lib/reports/spec";
import type {
  ModelDescriptor,
  EntityDescriptor,
  FieldDescriptor,
} from "@/lib/reports/descriptor";
import type {
  MetricCard,
  RuleRow,
  AlertRow,
  MetricStatus,
} from "@/lib/strategy/dashboard";
import type {
  MetricFormat,
  MetricGoal,
  RuleConditionType,
  RuleSeverity,
} from "@/lib/strategy/store";

/**
 * The Strategy Monitor dashboard — a tabbed hub over the strategy engine.
 * The Dashboard tab shows live KPI cards and open alerts; Metrics builds
 * scalar metrics (single-aggregate report specs); Rules builds the watchers
 * that fire alerts. Every mutating action refreshes the route.
 */

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const selectClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500";

/** The filter operators, in display order, with their labels. */
const FILTER_OPS: { op: FilterOp; label: string }[] = [
  { op: "eq", label: "equals" },
  { op: "ne", label: "not equals" },
  { op: "contains", label: "contains" },
  { op: "gt", label: ">" },
  { op: "lt", label: "<" },
  { op: "gte", label: "≥" },
  { op: "lte", label: "≤" },
  { op: "is_empty", label: "is empty" },
  { op: "not_empty", label: "is not empty" },
];

const AGG_FNS: AggFn[] = ["count", "sum", "avg", "min", "max"];

const THRESHOLD_COMPARATORS: { value: string; label: string }[] = [
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
];

const TREND_COMPARATORS: { value: string; label: string }[] = [
  { value: "drop", label: "drops by" },
  { value: "rise", label: "rises by" },
];

type TabKey = "dashboard" | "metrics" | "rules" | "assistant";

const TABS: { key: TabKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "metrics", label: "Metrics" },
  { key: "rules", label: "Rules" },
  { key: "assistant", label: "AI assistant" },
];

/** Format a metric value by its format. */
function formatValue(value: number, format: MetricFormat): string {
  if (format === "money") {
    return (
      "$" +
      (value / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })
    );
  }
  if (format === "percent") return value + "%";
  return value.toLocaleString();
}

/* ── Status styling ──────────────────────────────────────────────────────── */

const STATUS_META: Record<
  MetricStatus,
  { label: string; badge: string; border: string }
> = {
  on_track: {
    label: "On track",
    badge: "bg-green-50 text-green-700",
    border: "border-green-200",
  },
  at_risk: {
    label: "At risk",
    badge: "bg-amber-50 text-amber-700",
    border: "border-amber-200",
  },
  breached: {
    label: "Breached",
    badge: "bg-rose-50 text-rose-700",
    border: "border-rose-200",
  },
};

const SEVERITY_META: Record<
  RuleSeverity,
  { dot: string; badge: string }
> = {
  info: { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700" },
  warning: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
  critical: { dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700" },
};

/** Human description of a rule's condition. */
function describeRule(rule: RuleRow): string {
  const cmp =
    THRESHOLD_COMPARATORS.find((c) => c.value === rule.comparator)?.label ??
    rule.comparator;
  if (rule.conditionType === "threshold") {
    return `Value ${cmp} ${rule.threshold}`;
  }
  if (rule.conditionType === "target") {
    return "Misses its target";
  }
  const dir = rule.comparator === "rise" ? "rises by" : "drops by";
  return `${dir} ${rule.threshold}% over ${rule.windowDays}d`;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export function StrategyDashboard({
  model,
  metrics,
  rules,
  alerts,
}: {
  model: ModelDescriptor;
  metrics: MetricCard[];
  rules: RuleRow[];
  alerts: AlertRow[];
}) {
  const [tab, setTab] = useState<TabKey>("dashboard");

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? (
        <DashboardTab metrics={metrics} alerts={alerts} />
      ) : null}
      {tab === "metrics" ? (
        <MetricsTab model={model} metrics={metrics} />
      ) : null}
      {tab === "rules" ? <RulesTab metrics={metrics} rules={rules} /> : null}
      {tab === "assistant" ? <StrategyAssistantPanel /> : null}
    </div>
  );
}

/* ── Dashboard tab ───────────────────────────────────────────────────────── */

function DashboardTab({
  metrics,
  alerts,
}: {
  metrics: MetricCard[];
  alerts: AlertRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh(): void {
    startTransition(async () => {
      await refreshStrategyAction();
      router.refresh();
    });
  }

  function acknowledge(id: string): void {
    startTransition(async () => {
      await acknowledgeAlertAction(id);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">
          Snapshots every metric and re-checks every rule.
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {pending ? "Refreshing…" : "Refresh now"}
        </button>
      </div>

      {alerts.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700">
            Open alerts
          </p>
          <ul className="divide-y divide-gray-100">
            {alerts.map((a) => {
              const sev = SEVERITY_META[a.severity];
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${sev.dot}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">{a.message}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${sev.badge}`}
                  >
                    {a.severity}
                  </span>
                  <button
                    type="button"
                    onClick={() => acknowledge(a.id)}
                    disabled={pending}
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                  >
                    Acknowledge
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {metrics.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
          No metrics yet. Add one on the Metrics tab to start tracking.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <KpiCard key={m.id} metric={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ metric }: { metric: MetricCard }) {
  const status = STATUS_META[metric.status];

  let trend: { arrow: string; good: boolean; pct: number } | null = null;
  if (metric.trendPct != null) {
    const up = metric.trendPct >= 0;
    const good = metric.goalDirection === "higher" ? up : !up;
    trend = {
      arrow: up ? "▲" : "▼",
      good,
      pct: Math.abs(metric.trendPct),
    };
  }

  return (
    <div className={`rounded-xl border bg-white p-4 ${status.border}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-700">{metric.name}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.badge}`}
        >
          {status.label}
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">
        {formatValue(metric.current, metric.format)}
      </p>
      {metric.target != null ? (
        <p className="mt-1 text-xs text-gray-400">
          Target: {formatValue(metric.target, metric.format)}
        </p>
      ) : null}
      {trend ? (
        <p
          className={`mt-1 text-xs font-medium ${
            trend.good ? "text-green-600" : "text-rose-600"
          }`}
        >
          {trend.arrow} {trend.pct.toFixed(0)}% over {metric.trendDays}d
        </p>
      ) : null}
    </div>
  );
}

/* ── Metrics tab ─────────────────────────────────────────────────────────── */

interface MetricFormState {
  id?: string;
  name: string;
  description: string;
  base: string;
  fn: AggFn;
  aggEntity: string;
  aggField: string;
  filters: ReportFilter[];
  format: MetricFormat;
  target: string;
  goalDirection: MetricGoal;
}

function MetricsTab({
  model,
  metrics,
}: {
  model: ModelDescriptor;
  metrics: MetricCard[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const entityByKey = useMemo(() => {
    const map = new Map<string, EntityDescriptor>();
    for (const e of model.entities) map.set(e.key, e);
    return map;
  }, [model.entities]);

  const firstBase = model.entities[0]?.key ?? "";

  function freshForm(): MetricFormState {
    return {
      name: "",
      description: "",
      base: firstBase,
      fn: "count",
      aggEntity: firstBase,
      aggField: "",
      filters: [],
      format: "number",
      target: "",
      goalDirection: "higher",
    };
  }

  const [form, setForm] = useState<MetricFormState>(freshForm);

  /** Entities reachable from the current base, in model order. */
  const reachableEntities = useMemo<EntityDescriptor[]>(() => {
    const keys = model.reachable[form.base] ?? [];
    return keys
      .map((k) => entityByKey.get(k))
      .filter((e): e is EntityDescriptor => e != null);
  }, [model.reachable, form.base, entityByKey]);

  function fieldsOf(entityKey: string): FieldDescriptor[] {
    return entityByKey.get(entityKey)?.fields ?? [];
  }

  function numberFieldsOf(entityKey: string): FieldDescriptor[] {
    return fieldsOf(entityKey).filter(
      (f) => f.type === "number" || f.type === "money",
    );
  }

  function patch(p: Partial<MetricFormState>): void {
    setForm((f) => ({ ...f, ...p }));
  }

  function changeBase(base: string): void {
    setForm((f) => ({
      ...f,
      base,
      aggEntity: base,
      aggField: "",
      filters: [],
    }));
  }

  function newMetric(): void {
    setForm(freshForm());
    setError("");
  }

  function editMetric(m: MetricCard): void {
    const agg = m.spec.aggregates[0];
    setForm({
      id: m.id,
      name: m.name,
      description: m.description ?? "",
      base: m.spec.base,
      fn: agg?.fn ?? "count",
      aggEntity: agg?.entity || m.spec.base,
      aggField: agg?.field ?? "",
      filters: m.spec.filters.map((fl) => ({ ...fl })),
      format: m.format,
      target: m.target != null ? String(m.target) : "",
      goalDirection: m.goalDirection,
    });
    setError("");
  }

  function deleteMetric(m: MetricCard): void {
    if (!confirm(`Delete metric "${m.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteMetricAction(m.id);
      if (form.id === m.id) newMetric();
      router.refresh();
    });
  }

  // Filters
  function addFilter(): void {
    const first = reachableEntities[0];
    setForm((f) => ({
      ...f,
      filters: [
        ...f.filters,
        {
          entity: first?.key ?? "",
          field: first?.fields[0]?.key ?? "",
          op: "eq",
          value: "",
        },
      ],
    }));
  }

  function updateFilter(i: number, p: Partial<ReportFilter>): void {
    setForm((f) => ({
      ...f,
      filters: f.filters.map((fl, idx) => (idx === i ? { ...fl, ...p } : fl)),
    }));
  }

  function removeFilter(i: number): void {
    setForm((f) => ({
      ...f,
      filters: f.filters.filter((_, idx) => idx !== i),
    }));
  }

  function save(): void {
    if (!form.name.trim()) {
      setError("Give the metric a name before saving.");
      return;
    }
    if (form.fn !== "count" && !form.aggField) {
      setError("Pick a field to aggregate, or use the count function.");
      return;
    }
    const aggregate: ReportAggregate =
      form.fn === "count"
        ? { fn: "count", entity: form.base, field: "" }
        : { fn: form.fn, entity: form.aggEntity, field: form.aggField };

    const spec: ReportSpec = {
      ...emptySpec(form.base),
      filters: form.filters,
      aggregates: [aggregate],
    };

    const targetNum = form.target.trim() ? Number(form.target) : null;
    if (form.target.trim() && Number.isNaN(targetNum)) {
      setError("Target must be a number.");
      return;
    }

    setError("");
    startTransition(async () => {
      await saveMetricAction({
        id: form.id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        spec,
        format: form.format,
        target: targetNum,
        goalDirection: form.goalDirection,
      });
      newMetric();
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-5">
      {/* Existing metrics */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <p className="border-b border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700">
          Metrics
        </p>
        {metrics.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No metrics yet. Build one below.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {metrics.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    {m.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {m.format}
                    {m.target != null
                      ? ` · target ${formatValue(m.target, m.format)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => editMetric(m)}
                  className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteMetric(m)}
                  disabled={pending}
                  className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Metric builder */}
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            {form.id ? "Edit metric" : "New metric"}
          </p>
          {form.id ? (
            <button
              type="button"
              onClick={newMetric}
              className="text-xs font-semibold text-gray-500 transition hover:text-gray-700"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Name
            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Metric name"
              className={inputClass}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Description
            <input
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
        </div>

        {/* Base record type */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Base record type
            <select
              value={form.base}
              onChange={(e) => changeBase(e.target.value)}
              className={inputClass}
            >
              {model.entities.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-xs text-gray-400">
            A metric is a single number — one total over this record type.
          </p>
        </div>

        {/* The single aggregate */}
        <div>
          <p className="text-sm font-semibold text-gray-700">Value</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={form.fn}
              onChange={(e) =>
                patch({ fn: e.target.value as AggFn, aggField: "" })
              }
              className={selectClass}
            >
              {AGG_FNS.map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>
            {form.fn !== "count" ? (
              <>
                <select
                  value={form.aggEntity}
                  onChange={(e) =>
                    patch({ aggEntity: e.target.value, aggField: "" })
                  }
                  className={selectClass}
                >
                  {reachableEntities.map((e) => (
                    <option key={e.key} value={e.key}>
                      {e.label}
                    </option>
                  ))}
                </select>
                <select
                  value={form.aggField}
                  onChange={(e) => patch({ aggField: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Field…</option>
                  {numberFieldsOf(form.aggEntity).map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
        </div>

        {/* Filters */}
        <div>
          <p className="text-sm font-semibold text-gray-700">Filters</p>
          <div className="mt-2 space-y-2">
            {form.filters.map((f, i) => {
              const hideValue =
                f.op === "is_empty" || f.op === "not_empty";
              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    value={f.entity}
                    onChange={(e) =>
                      updateFilter(i, {
                        entity: e.target.value,
                        field: fieldsOf(e.target.value)[0]?.key ?? "",
                      })
                    }
                    className={selectClass}
                  >
                    {reachableEntities.map((e) => (
                      <option key={e.key} value={e.key}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={f.field}
                    onChange={(e) =>
                      updateFilter(i, { field: e.target.value })
                    }
                    className={selectClass}
                  >
                    {fieldsOf(f.entity).map((fld) => (
                      <option key={fld.key} value={fld.key}>
                        {fld.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={f.op}
                    onChange={(e) =>
                      updateFilter(i, { op: e.target.value as FilterOp })
                    }
                    className={selectClass}
                  >
                    {FILTER_OPS.map((o) => (
                      <option key={o.op} value={o.op}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {!hideValue ? (
                    <input
                      value={f.value}
                      onChange={(e) =>
                        updateFilter(i, { value: e.target.value })
                      }
                      placeholder="Value"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeFilter(i)}
                    className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addFilter}
            className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            + Add filter
          </button>
        </div>

        {/* Format / target / goal */}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Format
            <select
              value={form.format}
              onChange={(e) =>
                patch({ format: e.target.value as MetricFormat })
              }
              className={inputClass}
            >
              <option value="money">money</option>
              <option value="number">number</option>
              <option value="percent">percent</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Target
            <input
              type="number"
              value={form.target}
              onChange={(e) => patch({ target: e.target.value })}
              placeholder="Optional"
              className={inputClass}
            />
            {form.format === "money" ? (
              <span className="mt-1 block text-[10px] font-normal normal-case text-gray-400">
                in cents — 1000000 = $10,000
              </span>
            ) : null}
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Goal
            <select
              value={form.goalDirection}
              onChange={(e) =>
                patch({ goalDirection: e.target.value as MetricGoal })
              }
              className={inputClass}
            >
              <option value="higher">Higher is better</option>
              <option value="lower">Lower is better</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save metric"}
          </button>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ── Rules tab ───────────────────────────────────────────────────────────── */

interface RuleFormState {
  id?: string;
  name: string;
  metricId: string;
  conditionType: RuleConditionType;
  comparator: string;
  threshold: string;
  windowDays: string;
  severity: RuleSeverity;
  enabled: boolean;
}

function RulesTab({
  metrics,
  rules,
}: {
  metrics: MetricCard[];
  rules: RuleRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function freshForm(): RuleFormState {
    return {
      name: "",
      metricId: metrics[0]?.id ?? "",
      conditionType: "threshold",
      comparator: "gt",
      threshold: "",
      windowDays: "",
      severity: "warning",
      enabled: true,
    };
  }

  const [form, setForm] = useState<RuleFormState>(freshForm);

  function patch(p: Partial<RuleFormState>): void {
    setForm((f) => ({ ...f, ...p }));
  }

  function changeConditionType(ct: RuleConditionType): void {
    setForm((f) => ({
      ...f,
      conditionType: ct,
      comparator:
        ct === "threshold" ? "gt" : ct === "trend" ? "drop" : "",
    }));
  }

  function newRule(): void {
    setForm(freshForm());
    setError("");
  }

  function editRule(r: RuleRow): void {
    setForm({
      id: r.id,
      name: r.name,
      metricId: r.metricId,
      conditionType: r.conditionType,
      comparator: r.comparator,
      threshold: String(r.threshold),
      windowDays: String(r.windowDays),
      severity: r.severity,
      enabled: r.enabled,
    });
    setError("");
  }

  function deleteRule(r: RuleRow): void {
    if (!confirm(`Delete rule "${r.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteRuleAction(r.id);
      if (form.id === r.id) newRule();
      router.refresh();
    });
  }

  function save(): void {
    if (!form.name.trim()) {
      setError("Give the rule a name before saving.");
      return;
    }
    if (!form.metricId) {
      setError("Pick a metric for this rule to watch.");
      return;
    }

    let comparator = "";
    let threshold = 0;
    let windowDays = 0;

    if (form.conditionType === "threshold") {
      comparator = form.comparator;
      threshold = Number(form.threshold);
      if (Number.isNaN(threshold)) {
        setError("Threshold must be a number.");
        return;
      }
    } else if (form.conditionType === "trend") {
      comparator = form.comparator;
      threshold = Number(form.threshold);
      windowDays = Number(form.windowDays);
      if (Number.isNaN(threshold) || Number.isNaN(windowDays)) {
        setError("Percent and days must be numbers.");
        return;
      }
    }

    setError("");
    startTransition(async () => {
      await saveRuleAction({
        id: form.id,
        metricId: form.metricId,
        name: form.name.trim(),
        conditionType: form.conditionType,
        comparator,
        threshold,
        windowDays,
        severity: form.severity,
        enabled: form.enabled,
      });
      newRule();
      router.refresh();
    });
  }

  const noMetrics = metrics.length === 0;

  return (
    <div className="mt-4 space-y-5">
      {/* Existing rules */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <p className="border-b border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700">
          Rules
        </p>
        {rules.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No rules yet. Build one below.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rules.map((r) => {
              const sev = SEVERITY_META[r.severity];
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      {r.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.metricName} · {describeRule(r)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${sev.badge}`}
                  >
                    {r.severity}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      r.enabled ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {r.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    onClick={() => editRule(r)}
                    className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRule(r)}
                    disabled={pending}
                    className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Rule builder */}
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            {form.id ? "Edit rule" : "New rule"}
          </p>
          {form.id ? (
            <button
              type="button"
              onClick={newRule}
              className="text-xs font-semibold text-gray-500 transition hover:text-gray-700"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Name
            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Rule name"
              className={inputClass}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Metric
            <select
              value={form.metricId}
              onChange={(e) => patch({ metricId: e.target.value })}
              disabled={noMetrics}
              className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
            >
              {noMetrics ? <option value="">No metrics</option> : null}
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {noMetrics ? (
              <span className="mt-1 block text-[10px] font-normal normal-case text-gray-400">
                Add a metric on the Metrics tab first.
              </span>
            ) : null}
          </label>
        </div>

        {/* Condition */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Condition type
            <select
              value={form.conditionType}
              onChange={(e) =>
                changeConditionType(e.target.value as RuleConditionType)
              }
              className={inputClass}
            >
              <option value="threshold">threshold</option>
              <option value="target">target</option>
              <option value="trend">trend</option>
            </select>
          </label>

          {form.conditionType === "threshold" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={form.comparator}
                onChange={(e) => patch({ comparator: e.target.value })}
                className={selectClass}
              >
                {THRESHOLD_COMPARATORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={form.threshold}
                onChange={(e) => patch({ threshold: e.target.value })}
                placeholder="Threshold"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          ) : null}

          {form.conditionType === "target" ? (
            <p className="mt-2 text-xs text-gray-400">
              Fires when the metric misses its target.
            </p>
          ) : null}

          {form.conditionType === "trend" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={form.comparator}
                onChange={(e) => patch({ comparator: e.target.value })}
                className={selectClass}
              >
                {TREND_COMPARATORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-500">
                <input
                  type="number"
                  value={form.threshold}
                  onChange={(e) => patch({ threshold: e.target.value })}
                  placeholder="percent"
                  className="ml-1 w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <span className="ml-1">percent</span>
              </label>
              <label className="text-xs text-gray-500">
                <input
                  type="number"
                  value={form.windowDays}
                  onChange={(e) => patch({ windowDays: e.target.value })}
                  placeholder="days"
                  className="ml-1 w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <span className="ml-1">days</span>
              </label>
            </div>
          ) : null}
        </div>

        {/* Severity / enabled */}
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Severity
            <select
              value={form.severity}
              onChange={(e) =>
                patch({ severity: e.target.value as RuleSeverity })
              }
              className={inputClass}
            >
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => patch({ enabled: e.target.checked })}
            />
            Enabled
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={save}
            disabled={pending || noMetrics}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save rule"}
          </button>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
