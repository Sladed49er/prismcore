import Anthropic from "@anthropic-ai/sdk";
import { buildModelDescriptor } from "@/lib/reports/descriptor";
import type { ReportSpec } from "@/lib/reports/spec";
import {
  listMetrics,
  listRules,
  saveMetric,
  saveRule,
  getMetric,
  type MetricFormat,
  type MetricGoal,
  type RuleConditionType,
  type RuleSeverity,
} from "@/lib/strategy/store";
import { computeMetric, formatMetricValue } from "@/lib/strategy/engine";

/**
 * The AI strategy assistant — defines KPI metrics and the rules that watch
 * them, from plain language.
 *
 * Same safety model as the other assistants: it only ever emits structured
 * objects (a metric's scalar ReportSpec, a rule definition) — never SQL — and
 * every tool is RLS-bound to one tenant. It cannot reach code or another
 * tenant. Read-only checks (compute_metric) and writes (create_metric /
 * create_rule) are all that it can do.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ROUNDS = 12;

export interface StrategyAssistantResult {
  messages: Anthropic.MessageParam[];
  reply: string;
  /** What the assistant created this turn, for the UI to surface. */
  created: string[];
  error?: string;
}

const SYSTEM_PROMPT = `You are the strategy assistant for Prism Core, a platform for independent insurance agencies. You set up KPI monitoring for ONE agency from plain conversation.

You are autonomous: when asked to track something or be alerted about something, create the metric and/or rule directly — don't ask permission. Everything is isolated to this agency and is read-only monitoring.

Concepts:
- A METRIC is a single number derived from the agency's data — a scalar report: a base entity, one aggregate (count/sum/avg/min/max), and optional filters. Examples: open A/R = sum of invoice amount where status != paid; new business this month = count of policies created this month.
- A METRIC has a format (money | number | percent), an optional target, and a goal direction (is higher better, or lower).
- A RULE watches a metric and fires an alert:
  - threshold: the value crosses a fixed number (comparator gt|lt|gte|lte).
  - target: the value misses the metric's target (no extra params).
  - trend: the value drops/rises by a percent over N days (comparator drop|rise, threshold = percent, windowDays = N).

How you work:
- Call get_report_model FIRST to see entities and their fields. Never guess a field key.
- Call list_strategy to see metrics/rules that already exist — reuse a metric rather than duplicating it.
- MONEY fields are stored in CENTS. A "$40,000" target or threshold is 4000000. Metric format "money" means the value is cents.
- Use compute_metric after creating a metric if it helps you tell the user the current value.
- After acting, reply in 1-3 short sentences describing what you set up.
- If asked for something outside strategy monitoring, say you only set up metrics and rules.`;

const FILTER_SCHEMA = {
  type: "array" as const,
  items: {
    type: "object" as const,
    properties: {
      entity: { type: "string" as const },
      field: { type: "string" as const },
      op: {
        type: "string" as const,
        enum: ["eq", "ne", "contains", "gt", "lt", "gte", "lte", "is_empty", "not_empty"],
      },
      value: { type: "string" as const },
    },
    required: ["entity", "field", "op", "value"],
  },
};

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_report_model",
    description:
      "Return the data model: entities, their fields (key, label, type), and which entities are reachable from each base. Call before building a metric.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_strategy",
    description: "List the metrics and rules that already exist for this agency.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "compute_metric",
    description: "Compute a metric's current value (by metric id).",
    input_schema: {
      type: "object",
      properties: { metricId: { type: "string" } },
      required: ["metricId"],
    },
  },
  {
    name: "create_metric",
    description:
      "Create a KPI metric — a scalar report. Returns the new metricId.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        base: { type: "string", description: "Base entity key." },
        aggregate: {
          type: "object",
          properties: {
            fn: { type: "string", enum: ["count", "sum", "avg", "min", "max"] },
            entity: { type: "string" },
            field: { type: "string", description: 'Field to aggregate; "" for count.' },
          },
          required: ["fn", "entity", "field"],
        },
        filters: FILTER_SCHEMA,
        format: { type: "string", enum: ["money", "number", "percent"] },
        target: { type: "number", description: "Optional; money targets in cents." },
        goalDirection: { type: "string", enum: ["higher", "lower"] },
      },
      required: ["name", "base", "aggregate", "filters", "format", "goalDirection"],
    },
  },
  {
    name: "create_rule",
    description: "Create a rule that watches a metric and raises an alert.",
    input_schema: {
      type: "object",
      properties: {
        metricId: { type: "string" },
        name: { type: "string" },
        conditionType: { type: "string", enum: ["threshold", "target", "trend"] },
        comparator: {
          type: "string",
          description: "threshold: gt|lt|gte|lte · trend: drop|rise · target: \"\"",
        },
        threshold: { type: "number", description: "threshold value, or trend percent" },
        windowDays: { type: "number", description: "trend lookback days; else 0" },
        severity: { type: "string", enum: ["info", "warning", "critical"] },
      },
      required: ["metricId", "name", "conditionType", "comparator", "threshold", "windowDays", "severity"],
    },
  },
];

/** Build the scalar metric spec the create_metric tool was given. */
function metricSpec(input: Record<string, unknown>): ReportSpec {
  const agg = (input.aggregate ?? {}) as Record<string, unknown>;
  return {
    base: String(input.base ?? ""),
    columns: [],
    filters: Array.isArray(input.filters)
      ? (input.filters as ReportSpec["filters"])
      : [],
    groupBy: [],
    aggregates: [
      {
        fn: String(agg.fn ?? "count") as ReportSpec["aggregates"][number]["fn"],
        entity: String(agg.entity ?? input.base ?? ""),
        field: String(agg.field ?? ""),
      },
    ],
  };
}

export async function runStrategyAssistant(
  tenantId: string,
  actorName: string,
  messages: Anthropic.MessageParam[],
): Promise<StrategyAssistantResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      messages,
      reply: "",
      created: [],
      error: "The strategy assistant is not configured (no ANTHROPIC_API_KEY).",
    };
  }

  const client = new Anthropic({ apiKey });
  const history = [...messages];
  const created: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: history,
    });
    history.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const reply = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { messages: history, reply, created };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      try {
        const input = (block.input ?? {}) as Record<string, unknown>;
        let result: unknown;

        if (block.name === "get_report_model") {
          result = buildModelDescriptor();
        } else if (block.name === "list_strategy") {
          const [metrics, rules] = await Promise.all([
            listMetrics(tenantId),
            listRules(tenantId),
          ]);
          result = {
            metrics: metrics.map((m) => ({
              id: m.id,
              name: m.name,
              format: m.format,
            })),
            rules: rules.map((r) => ({
              id: r.id,
              name: r.name,
              metricId: r.metricId,
            })),
          };
        } else if (block.name === "compute_metric") {
          const metric = await getMetric(tenantId, String(input.metricId));
          if (!metric) {
            result = { error: "metric not found" };
          } else {
            const value = await computeMetric(tenantId, metric.spec);
            result = {
              value,
              formatted: formatMetricValue(value, metric.format),
            };
          }
        } else if (block.name === "create_metric") {
          const id = await saveMetric(tenantId, {
            name: String(input.name ?? "Untitled metric"),
            description: input.description ? String(input.description) : null,
            spec: metricSpec(input),
            format: String(input.format ?? "number") as MetricFormat,
            target:
              typeof input.target === "number" ? input.target : null,
            goalDirection: String(
              input.goalDirection ?? "higher",
            ) as MetricGoal,
            createdBy: actorName,
          });
          created.push(`Metric: ${String(input.name)}`);
          result = { metricId: id };
        } else if (block.name === "create_rule") {
          await saveRule(tenantId, {
            metricId: String(input.metricId),
            name: String(input.name ?? "Untitled rule"),
            conditionType: String(
              input.conditionType ?? "threshold",
            ) as RuleConditionType,
            comparator: String(input.comparator ?? ""),
            threshold: typeof input.threshold === "number" ? input.threshold : 0,
            windowDays:
              typeof input.windowDays === "number" ? input.windowDays : 0,
            severity: String(input.severity ?? "warning") as RuleSeverity,
            enabled: true,
            createdBy: actorName,
          });
          created.push(`Rule: ${String(input.name)}`);
          result = { ok: true };
        } else {
          result = { error: `Unknown tool: ${block.name}` };
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          is_error: true,
          content:
            error instanceof Error ? error.message : "Tool execution failed",
        });
      }
    }
    history.push({ role: "user", content: toolResults });
  }

  return {
    messages: history,
    reply: "I set some of that up but ran long — ask me to continue.",
    created,
    error: "tool-round limit reached",
  };
}
