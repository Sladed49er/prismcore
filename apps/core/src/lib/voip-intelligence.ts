import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  withTenantContext,
  calls,
  callInsights,
  complianceFlags,
  type Call,
  type CallInsight,
  type ComplianceFlag,
} from "@prismcore/db";

/**
 * Call intelligence — the AI layer over PrismVoice calls, ported from
 * CallIntel's revenue-intelligence and compliance-watchdog.
 *
 * One Claude call per call-record reads the call's AI summary (or transcript)
 * and returns, through a single forced tool call, two structured lists:
 * revenue insights (cross-sell, renewal risk, follow-ups) and E&O compliance
 * flags. Trusted code validates the shapes and writes them RLS-scoped — the
 * model never touches the database. The model is conservative by instruction:
 * most routine calls yield nothing.
 */

const MODEL = "claude-haiku-4-5-20251001";

const INSIGHT_KINDS = ["cross_sell", "renewal_risk", "follow_up"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const FLAG_CATEGORIES = [
  "missed_disclosure",
  "overpromise",
  "documentation_gap",
  "regulatory_concern",
] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;

const SYSTEM_PROMPT = `You are the call-intelligence analyst for Prism Core, a platform for independent insurance agencies. You review a single phone call (given as its AI summary or transcript) and return two things: revenue insights and E&O compliance flags.

REVENUE INSIGHTS — only genuine opportunities; most routine calls have none:
- cross_sell — a life event or coverage gap (new vehicle, new home, new business, marriage, baby, coverage question). Give a rough annual premium estimate and the product type (auto, home, umbrella, life, commercial, flood, etc.).
- renewal_risk — dissatisfaction, rate shopping, a cancellation mention.
- follow_up — a promise made (send a quote, call back, mail documents). Give a due date 1-3 business days out. Do NOT flag routine call logging.

COMPLIANCE FLAGS — be VERY conservative; routine status/payment/simple-question calls have none. Calls under 2 minutes are almost always routine.
- missed_disclosure — exclusions or limits not explained during a coverage discussion.
- overpromise — guaranteeing a claim outcome, verbally binding without authority, guaranteeing a rate.
- documentation_gap — a verbal agreement or coverage change with no written confirmation.
- regulatory_concern — privacy, licensing, rebating, advice outside P&C.

Call record_analysis exactly once. Both lists may be empty — that is the expected result for most calls. When in doubt, do not flag.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "record_analysis",
    description: "Record the call analysis. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: [...INSIGHT_KINDS] },
              title: { type: "string" },
              detail: { type: "string" },
              priority: { type: "string", enum: [...PRIORITIES] },
              estimatedValue: { type: "string" },
              productType: { type: "string" },
              dueDate: {
                type: "string",
                description: "ISO date (YYYY-MM-DD) — follow_up only",
              },
            },
            required: ["kind", "title", "detail", "priority"],
          },
        },
        complianceFlags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: [...FLAG_CATEGORIES] },
              severity: { type: "string", enum: [...SEVERITIES] },
              title: { type: "string" },
              detail: { type: "string" },
              regulation: { type: "string" },
            },
            required: ["category", "severity", "title", "detail"],
          },
        },
      },
      required: ["insights", "complianceFlags"],
    },
  },
];

/** The text the analyst reads — the AI summary, else the transcript. */
function callText(call: Call): string {
  return (call.aiSummary ?? call.transcript ?? "").trim();
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = String(value ?? "").toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Push a due date that is not in the past to the next business day. */
function sanitizeDueDate(value: unknown): string | null {
  const s = String(value ?? "");
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(s);
  if (!m) return null;
  const parsed = new Date(s + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed >= today) return s;
  const next = new Date(today);
  next.setDate(next.getDate() + 1);
  if (next.getDay() === 0) next.setDate(next.getDate() + 1);
  if (next.getDay() === 6) next.setDate(next.getDate() + 2);
  return next.toISOString().slice(0, 10);
}

export interface AnalyzeResult {
  ok: boolean;
  message: string;
  insights: number;
  flags: number;
}

type InsightInsert = typeof callInsights.$inferInsert;
type FlagInsert = typeof complianceFlags.$inferInsert;

interface RawAnalysis {
  insights: { rows: InsightInsert[] };
  flags: { rows: FlagInsert[] };
}

/** Run one call through Claude and shape the result into insert rows. */
async function analyzeOne(
  apiKey: string,
  tenantId: string,
  call: Call,
): Promise<RawAnalysis> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    tool_choice: { type: "tool", name: "record_analysis" },
    messages: [
      {
        role: "user",
        content: `Analyse this ${call.direction} call${
          call.matchedContactName ? ` with ${call.matchedContactName}` : ""
        }${
          call.durationSeconds
            ? ` (${Math.round(call.durationSeconds / 60)} min)`
            : ""
        }.\n\n${callText(call)}`,
      },
    ],
  });
  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  const raw = (toolUse?.input ?? {}) as {
    insights?: unknown;
    complianceFlags?: unknown;
  };
  const contactName = call.matchedContactName ?? call.contactName ?? "";

  const insightRows = (Array.isArray(raw.insights) ? raw.insights : [])
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((i) => ({
      tenantId,
      callId: call.id,
      kind: oneOf(i.kind, INSIGHT_KINDS, "follow_up"),
      title: String(i.title ?? "").slice(0, 200),
      detail: String(i.detail ?? "").slice(0, 1000),
      priority: oneOf(i.priority, PRIORITIES, "medium"),
      estimatedValue: String(i.estimatedValue ?? "").slice(0, 50),
      productType: String(i.productType ?? "").slice(0, 50),
      dueDate: sanitizeDueDate(i.dueDate),
      contactName,
    }))
    .filter((i) => i.title);

  const flagRows = (Array.isArray(raw.complianceFlags) ? raw.complianceFlags : [])
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      tenantId,
      callId: call.id,
      category: oneOf(f.category, FLAG_CATEGORIES, "documentation_gap"),
      severity: oneOf(f.severity, SEVERITIES, "medium"),
      title: String(f.title ?? "").slice(0, 200),
      detail: String(f.detail ?? "").slice(0, 1000),
      regulation: String(f.regulation ?? "").slice(0, 200),
      contactName,
    }))
    .filter((f) => f.title);

  return { insights: { rows: insightRows }, flags: { rows: flagRows } };
}

/** Persist an analysis and stamp the call as analysed. */
async function persist(
  tenantId: string,
  callId: string,
  analysis: RawAnalysis,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    if (analysis.insights.rows.length > 0) {
      await tx.insert(callInsights).values(analysis.insights.rows);
    }
    if (analysis.flags.rows.length > 0) {
      await tx.insert(complianceFlags).values(analysis.flags.rows);
    }
    await tx
      .update(calls)
      .set({ intelAnalyzedAt: new Date() })
      .where(eq(calls.id, callId));
  });
}

/** Analyse a single call by id. */
export async function analyzeCall(
  tenantId: string,
  callId: string,
): Promise<AnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message: "Call intelligence is not configured (no ANTHROPIC_API_KEY).",
      insights: 0,
      flags: 0,
    };
  }
  const call = await withTenantContext(tenantId, async (tx) => {
    const [row] = await tx.select().from(calls).where(eq(calls.id, callId));
    return row ?? null;
  });
  if (!call) {
    return { ok: false, message: "Call not found.", insights: 0, flags: 0 };
  }
  if (callText(call).length < 30) {
    return {
      ok: false,
      message: "This call has no summary or transcript to analyse.",
      insights: 0,
      flags: 0,
    };
  }
  try {
    const analysis = await analyzeOne(apiKey, tenantId, call);
    await persist(tenantId, callId, analysis);
    return {
      ok: true,
      message: "Call analysed.",
      insights: analysis.insights.rows.length,
      flags: analysis.flags.rows.length,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Analysis failed.",
      insights: 0,
      flags: 0,
    };
  }
}

/** The most calls one scan will analyse, to bound cost and latency. */
const SCAN_LIMIT = 25;

/**
 * Analyse every not-yet-analysed call that has text to work with — the batch
 * a "scan calls" button runs. Returns a tally for the UI.
 */
export async function scanRecentCalls(
  tenantId: string,
): Promise<AnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message: "Call intelligence is not configured (no ANTHROPIC_API_KEY).",
      insights: 0,
      flags: 0,
    };
  }
  const pending = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(calls)
      .where(and(eq(calls.tenantId, tenantId), isNull(calls.intelAnalyzedAt)))
      .orderBy(desc(calls.occurredAt))
      .limit(SCAN_LIMIT),
  );
  const toAnalyze = pending.filter((c) => callText(c).length >= 30);
  if (toAnalyze.length === 0) {
    return {
      ok: true,
      message: "No new calls with a summary or transcript to analyse.",
      insights: 0,
      flags: 0,
    };
  }

  let insights = 0;
  let flags = 0;
  let analyzed = 0;
  for (const call of toAnalyze) {
    try {
      const analysis = await analyzeOne(apiKey, tenantId, call);
      await persist(tenantId, call.id, analysis);
      insights += analysis.insights.rows.length;
      flags += analysis.flags.rows.length;
      analyzed++;
    } catch (error) {
      console.error(`[voip-intelligence] call ${call.id} failed:`, error);
    }
  }
  return {
    ok: true,
    message: `Analysed ${analyzed} call${analyzed === 1 ? "" : "s"} — ${insights} insight${
      insights === 1 ? "" : "s"
    }, ${flags} compliance flag${flags === 1 ? "" : "s"}.`,
    insights,
    flags,
  };
}

/** Open + recently-actioned revenue insights, newest first. */
export async function listInsights(tenantId: string): Promise<CallInsight[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(callInsights)
      .where(eq(callInsights.tenantId, tenantId))
      .orderBy(desc(callInsights.createdAt)),
  );
}

/** Compliance flags, newest first. */
export async function listComplianceFlags(
  tenantId: string,
): Promise<ComplianceFlag[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(complianceFlags)
      .where(eq(complianceFlags.tenantId, tenantId))
      .orderBy(desc(complianceFlags.createdAt)),
  );
}

/** Move a revenue insight to actioned / dismissed / open. */
export async function setInsightStatus(
  tenantId: string,
  id: string,
  status: "open" | "actioned" | "dismissed",
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(callInsights)
      .set({ status })
      .where(eq(callInsights.id, id));
  });
}

/** Resolve or reopen a compliance flag. */
export async function setFlagStatus(
  tenantId: string,
  id: string,
  status: "open" | "resolved",
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(complianceFlags)
      .set({ status })
      .where(eq(complianceFlags.id, id));
  });
}
