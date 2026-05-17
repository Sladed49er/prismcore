import Anthropic from "@anthropic-ai/sdk";
import { buildModelDescriptor } from "@/lib/reports/descriptor";
import { runReport, type ReportResult } from "@/lib/reports/engine";
import { saveReport } from "@/lib/reports/store";
import type { ReportSpec } from "@/lib/reports/spec";

/**
 * The AI report builder.
 *
 * Describe a report in plain language; the assistant assembles a structured
 * ReportSpec and runs it. Same safety model as the customization assistant:
 * the AI only ever emits a ReportSpec — never SQL — and the trusted engine
 * executes it RLS-scoped to one tenant. It physically cannot read another
 * tenant's data or anything outside the declared report model.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ROUNDS = 10;
/** Rows shown to the model per run — enough to describe, capped for context. */
const ROWS_TO_MODEL = 30;

export interface ReportAssistantResult {
  messages: Anthropic.MessageParam[];
  reply: string;
  /** The most recent report the assistant ran this turn, for the UI to show. */
  lastResult: ReportResult | null;
  /** Names of reports the assistant saved this turn. */
  saved: string[];
  error?: string;
}

const SYSTEM_PROMPT = `You are the report builder for Prism Core, a platform for independent insurance agencies. You build reports for ONE agency by conversation.

You are autonomous: when asked for a report, build it and run it — don't ask permission. Reports are read-only and isolated to this agency.

How you work:
- Call get_report_model FIRST to see the entities, their fields, and which entities are reachable from each base entity. Never guess a field key.
- A report has a BASE entity (the grain — one row per base record). You may use fields from any entity reachable from the base. Pick the base so the data you need is reachable.
- For a detail list: set "columns"; leave groupBy/aggregates empty.
- For a summary: set "groupBy" and "aggregates" (count/sum/avg/min/max); leave columns empty. count needs no field.
- Money fields are stored in CENTS — say so if relevant, but report the raw field; the UI formats it.
- Call run_report to execute a spec. Read the result, then reply in 1-3 short sentences describing what the report shows (mention row count and any headline number).
- Only call save_report when the user explicitly asks to save/keep a report.
- If asked for something outside reporting (changing data, settings, another agency), explain you only build reports.`;

const SPEC_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    base: { type: "string", description: "Base entity key." },
    columns: {
      type: "array",
      description: "Detail-report columns (omit for a grouped report).",
      items: {
        type: "object",
        properties: {
          entity: { type: "string" },
          field: { type: "string" },
        },
        required: ["entity", "field"],
      },
    },
    filters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          entity: { type: "string" },
          field: { type: "string" },
          op: {
            type: "string",
            enum: [
              "eq",
              "ne",
              "contains",
              "gt",
              "lt",
              "gte",
              "lte",
              "is_empty",
              "not_empty",
            ],
          },
          value: { type: "string" },
        },
        required: ["entity", "field", "op", "value"],
      },
    },
    groupBy: {
      type: "array",
      description: "Group-by fields (set these for a summary report).",
      items: {
        type: "object",
        properties: {
          entity: { type: "string" },
          field: { type: "string" },
        },
        required: ["entity", "field"],
      },
    },
    aggregates: {
      type: "array",
      description: "Totals for a grouped report.",
      items: {
        type: "object",
        properties: {
          fn: {
            type: "string",
            enum: ["count", "sum", "avg", "min", "max"],
          },
          entity: { type: "string" },
          field: {
            type: "string",
            description: "Field to aggregate; use \"\" for count.",
          },
        },
        required: ["fn", "entity", "field"],
      },
    },
    limit: { type: "number" },
  },
  required: ["base", "columns", "filters", "groupBy", "aggregates"],
};

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_report_model",
    description:
      "Return the report model: every entity, its fields (key, label, type), and which entities are reachable from each base entity. Call this before building a report.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "run_report",
    description:
      "Run a report spec and return its columns and rows. Use this to produce the answer.",
    input_schema: {
      type: "object",
      properties: { spec: SPEC_SCHEMA },
      required: ["spec"],
    },
  },
  {
    name: "save_report",
    description:
      "Save a report so the agency can re-run it later. Only when the user asks to save it.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        spec: SPEC_SCHEMA,
      },
      required: ["name", "spec"],
    },
  },
];

/** Coerce a tool's loosely-typed spec input into a ReportSpec. */
function toSpec(raw: unknown): ReportSpec {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    base: String(s.base ?? ""),
    columns: Array.isArray(s.columns) ? (s.columns as ReportSpec["columns"]) : [],
    filters: Array.isArray(s.filters) ? (s.filters as ReportSpec["filters"]) : [],
    groupBy: Array.isArray(s.groupBy)
      ? (s.groupBy as ReportSpec["groupBy"])
      : [],
    aggregates: Array.isArray(s.aggregates)
      ? (s.aggregates as ReportSpec["aggregates"])
      : [],
    limit: typeof s.limit === "number" ? s.limit : undefined,
  };
}

/** Run one turn of the report assistant — the user's message is on `messages`. */
export async function runReportAssistant(
  tenantId: string,
  messages: Anthropic.MessageParam[],
): Promise<ReportAssistantResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      messages,
      reply: "",
      lastResult: null,
      saved: [],
      error: "The report assistant is not configured (no ANTHROPIC_API_KEY).",
    };
  }

  const client = new Anthropic({ apiKey });
  const history = [...messages];
  let lastResult: ReportResult | null = null;
  const saved: string[] = [];

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
      return { messages: history, reply, lastResult, saved };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      try {
        const input = (block.input ?? {}) as Record<string, unknown>;
        let result: unknown;
        if (block.name === "get_report_model") {
          result = buildModelDescriptor();
        } else if (block.name === "run_report") {
          const r = await runReport(tenantId, toSpec(input.spec));
          lastResult = r;
          result = {
            columns: r.columns,
            rowCount: r.rows.length,
            rows: r.rows.slice(0, ROWS_TO_MODEL),
            truncated: r.rows.length > ROWS_TO_MODEL,
          };
        } else if (block.name === "save_report") {
          const spec = toSpec(input.spec);
          await saveReport(tenantId, {
            name: String(input.name ?? "Untitled report"),
            description: input.description
              ? String(input.description)
              : null,
            spec,
            createdBy: "AI assistant",
          });
          saved.push(String(input.name ?? "Untitled report"));
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
    reply: "I worked on that but ran long — ask me to continue.",
    lastResult,
    saved,
    error: "tool-round limit reached",
  };
}
