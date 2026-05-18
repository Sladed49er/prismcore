import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte } from "drizzle-orm";
import {
  withTenantContext,
  calls,
  callDigests,
  type Call,
  type CallDigest,
} from "@prismcore/db";

/**
 * Weekly digest — ported from CallIntel. Gathers the past week's call data,
 * compares it to the prior week, and asks Claude for a short narrative an
 * agency owner can act on. The gathered metrics and the AI narrative are
 * stored in `call_digests` so the history is browsable.
 */

const MODEL = "claude-sonnet-4-6";
const DAY = 86_400_000;
const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export interface AgentDigestRow {
  agentName: string;
  callsIn: number;
  callsOut: number;
  missed: number;
  answerRate: number | null;
  avgDurationSeconds: number | null;
}

export interface WeeklyDigestData {
  weekStart: string;
  weekEnd: string;
  totalCalls: number;
  inbound: number;
  outbound: number;
  missed: number;
  answerRate: number | null;
  avgDurationSeconds: number | null;
  totalCallsDelta: number;
  answerRateDelta: number | null;
  agents: AgentDigestRow[];
  busiestDay: string | null;
  busiestHour: string | null;
}

export interface DigestInsights {
  headlines: string[];
  coaching: string;
  staffing: string;
  weekComparison: string;
}

const isMissed = (c: Call): boolean =>
  c.status === "missed" || c.status === "voicemail";

/** Bucket a window of calls into the digest metrics. */
function metricsFor(window: Call[]) {
  const inbound = window.filter((c) => c.direction === "inbound");
  const answered = inbound.filter((c) => c.status === "completed").length;
  const completed = window.filter(
    (c) => c.status === "completed" && c.durationSeconds > 0,
  );
  const avgDuration =
    completed.length > 0
      ? Math.round(
          completed.reduce((s, c) => s + c.durationSeconds, 0) /
            completed.length,
        )
      : null;
  return {
    total: window.length,
    inbound: inbound.length,
    outbound: window.filter((c) => c.direction === "outbound").length,
    missed: inbound.filter(isMissed).length,
    answerRate:
      inbound.length > 0
        ? Math.round((answered / inbound.length) * 100)
        : null,
    avgDuration,
  };
}

/** Format an hour-of-day (0-23) as "10 AM" / "2 PM". */
function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

/** Gather this week's call data with prior-week comparison. */
function gather(thisWeek: Call[], lastWeek: Call[]): WeeklyDigestData {
  const tw = metricsFor(thisWeek);
  const lw = metricsFor(lastWeek);

  const agentMap = new Map<string, AgentDigestRow & { _durSum: number; _durN: number }>();
  for (const c of thisWeek) {
    const name = c.agentName ?? c.agentEmail ?? "Unassigned";
    let a = agentMap.get(name);
    if (!a) {
      a = {
        agentName: name,
        callsIn: 0,
        callsOut: 0,
        missed: 0,
        answerRate: null,
        avgDurationSeconds: null,
        _durSum: 0,
        _durN: 0,
      };
      agentMap.set(name, a);
    }
    if (c.direction === "inbound") a.callsIn++;
    else a.callsOut++;
    if (isMissed(c)) a.missed++;
    if (c.status === "completed" && c.durationSeconds > 0) {
      a._durSum += c.durationSeconds;
      a._durN++;
    }
  }
  const agents: AgentDigestRow[] = [...agentMap.values()]
    .map((a) => ({
      agentName: a.agentName,
      callsIn: a.callsIn,
      callsOut: a.callsOut,
      missed: a.missed,
      answerRate:
        a.callsIn > 0
          ? Math.round(((a.callsIn - a.missed) / a.callsIn) * 100)
          : null,
      avgDurationSeconds: a._durN > 0 ? Math.round(a._durSum / a._durN) : null,
    }))
    .sort((x, y) => y.callsIn + y.callsOut - (x.callsIn + x.callsOut));

  // Busiest day / hour, from the call timestamps.
  const dayCount = new Array(7).fill(0);
  const hourCount = new Array(24).fill(0);
  for (const c of thisWeek) {
    dayCount[c.occurredAt.getDay()]++;
    hourCount[c.occurredAt.getHours()]++;
  }
  const busiestDayIdx = dayCount.some((n) => n > 0)
    ? dayCount.indexOf(Math.max(...dayCount))
    : -1;
  const busiestHourIdx = hourCount.some((n) => n > 0)
    ? hourCount.indexOf(Math.max(...hourCount))
    : -1;

  const now = Date.now();
  return {
    weekStart: new Date(now - 7 * DAY).toISOString().slice(0, 10),
    weekEnd: new Date(now).toISOString().slice(0, 10),
    totalCalls: tw.total,
    inbound: tw.inbound,
    outbound: tw.outbound,
    missed: tw.missed,
    answerRate: tw.answerRate,
    avgDurationSeconds: tw.avgDuration,
    totalCallsDelta: tw.total - lw.total,
    answerRateDelta:
      tw.answerRate !== null && lw.answerRate !== null
        ? tw.answerRate - lw.answerRate
        : null,
    agents,
    busiestDay: busiestDayIdx >= 0 ? DAY_NAMES[busiestDayIdx]! : null,
    busiestHour: busiestHourIdx >= 0 ? hourLabel(busiestHourIdx) : null,
  };
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "record_digest",
    description: "Record the weekly digest narrative. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        headlines: { type: "array", items: { type: "string" } },
        coaching: { type: "string" },
        staffing: { type: "string" },
        weekComparison: { type: "string" },
      },
      required: ["headlines", "coaching", "staffing", "weekComparison"],
    },
  },
];

/** Ask Claude for the digest narrative; fall back to plain metrics on error. */
async function narrate(data: WeeklyDigestData): Promise<DigestInsights> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fallback: DigestInsights = {
    headlines: [
      `${data.totalCalls} calls this week with a ${data.answerRate ?? 0}% answer rate.`,
      data.totalCallsDelta === 0
        ? "Call volume was steady versus last week."
        : `Call volume ${data.totalCallsDelta > 0 ? "rose" : "fell"} by ${Math.abs(data.totalCallsDelta)} versus last week.`,
    ],
    coaching:
      data.agents.length > 0
        ? `Top of the board: ${data.agents[0]!.agentName} with ${data.agents[0]!.callsIn + data.agents[0]!.callsOut} calls.`
        : "No agent data this week.",
    staffing:
      data.busiestDay && data.busiestHour
        ? `Peak activity was ${data.busiestDay} around ${data.busiestHour}.`
        : "Not enough data for a staffing read.",
    weekComparison: "AI narrative unavailable — see the metrics above.",
  };
  if (!apiKey) return fallback;

  const agentLines = data.agents
    .slice(0, 15)
    .map(
      (a) =>
        `- ${a.agentName}: ${a.callsIn} in, ${a.callsOut} out, ${a.missed} missed, ${a.answerRate ?? "N/A"}% answer rate`,
    )
    .join("\n");

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      system:
        "You are an analytics advisor for an independent insurance agency. You are given one week of phone-call metrics and must return a short, plain-English digest the agency owner can act on. Name specific agents in coaching. Flag an answer rate below 85% as a concern. Call record_digest exactly once.",
      tools: TOOLS,
      tool_choice: { type: "tool", name: "record_digest" },
      messages: [
        {
          role: "user",
          content: `Week ${data.weekStart} to ${data.weekEnd}.

Total calls: ${data.totalCalls} (${data.totalCallsDelta >= 0 ? "+" : ""}${data.totalCallsDelta} vs last week)
Inbound ${data.inbound}, outbound ${data.outbound}, missed ${data.missed}
Answer rate: ${data.answerRate ?? "N/A"}%${
            data.answerRateDelta !== null
              ? ` (${data.answerRateDelta >= 0 ? "+" : ""}${data.answerRateDelta}pp vs last week)`
              : ""
          }
Average call duration: ${
            data.avgDurationSeconds !== null
              ? `${Math.floor(data.avgDurationSeconds / 60)}m ${data.avgDurationSeconds % 60}s`
              : "N/A"
          }
Busiest day: ${data.busiestDay ?? "N/A"}; busiest hour: ${data.busiestHour ?? "N/A"}

Agents:
${agentLines || "No agent data."}

Give 2-3 headlines, a coaching note, a staffing note, and a week-over-week comparison.`,
        },
      ],
    });
    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    const raw = (toolUse?.input ?? {}) as Record<string, unknown>;
    return {
      headlines: (Array.isArray(raw.headlines) ? raw.headlines : [])
        .map((h) => String(h).slice(0, 240))
        .slice(0, 4),
      coaching: String(raw.coaching ?? fallback.coaching).slice(0, 600),
      staffing: String(raw.staffing ?? fallback.staffing).slice(0, 600),
      weekComparison: String(
        raw.weekComparison ?? fallback.weekComparison,
      ).slice(0, 600),
    };
  } catch (error) {
    console.error("[voip-digest] narrate failed:", error);
    return fallback;
  }
}

export interface DigestResult {
  ok: boolean;
  message: string;
}

/** Generate and store this week's digest. */
export async function generateWeeklyDigest(
  tenantId: string,
): Promise<DigestResult> {
  const since = new Date(Date.now() - 14 * DAY);
  const recent = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(calls)
      .where(and(eq(calls.tenantId, tenantId), gte(calls.occurredAt, since)))
      .orderBy(desc(calls.occurredAt)),
  );
  const cutoff = Date.now() - 7 * DAY;
  const thisWeek = recent.filter((c) => c.occurredAt.getTime() >= cutoff);
  const lastWeek = recent.filter((c) => c.occurredAt.getTime() < cutoff);

  if (thisWeek.length === 0) {
    return { ok: false, message: "No calls in the past week to digest." };
  }

  const data = gather(thisWeek, lastWeek);
  const insights = await narrate(data);

  await withTenantContext(tenantId, async (tx) => {
    await tx.insert(callDigests).values({
      tenantId,
      periodStart: data.weekStart,
      periodEnd: data.weekEnd,
      data: data as unknown as Record<string, unknown>,
      insights: insights as unknown as Record<string, unknown>,
    });
  });
  return {
    ok: true,
    message: `Digest generated for ${thisWeek.length} call${thisWeek.length === 1 ? "" : "s"}.`,
  };
}

/** Stored digests, newest first. */
export async function listDigests(tenantId: string): Promise<CallDigest[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(callDigests)
      .where(eq(callDigests.tenantId, tenantId))
      .orderBy(desc(callDigests.createdAt)),
  );
}
