import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { withTenantContext, calls, type Call } from "@prismcore/db";

/**
 * Caller Intelligence Brief — ported from CallIntel. Given a client the
 * agency has spoken with, it builds a pre-call brief: their call pattern, the
 * last interaction, an AI sentiment read, and 2-3 talking points drawn from
 * recent call summaries. Computed on demand from the call log.
 */

const MODEL = "claude-haiku-4-5-20251001";
const DAY = 86_400_000;

export interface RecentContact {
  contactId: string;
  contactName: string;
  lastCall: string;
}

export interface CallerBrief {
  contactName: string;
  lastInteraction: string;
  callPattern: string;
  sentiment: "positive" | "neutral" | "needs-attention" | null;
  talkingPoints: string[];
  recentCalls: {
    date: string;
    direction: string;
    durationSeconds: number;
    summary: string | null;
  }[];
}

/** Clients with a matched call in the last 90 days — the brief picker list. */
export async function listRecentContacts(
  tenantId: string,
): Promise<RecentContact[]> {
  const since = new Date(Date.now() - 90 * DAY);
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(calls)
      .where(
        and(
          eq(calls.tenantId, tenantId),
          isNotNull(calls.matchedContactId),
          gte(calls.occurredAt, since),
        ),
      )
      .orderBy(desc(calls.occurredAt)),
  );
  const seen = new Map<string, RecentContact>();
  for (const c of rows) {
    const id = c.matchedContactId!;
    if (seen.has(id)) continue;
    seen.set(id, {
      contactId: id,
      contactName: c.matchedContactName ?? "Unknown client",
      lastCall: c.occurredAt.toISOString().slice(0, 10),
    });
  }
  return [...seen.values()];
}

function daysAgoLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** Build a pre-call brief for one matched contact. */
export async function generateCallerBrief(
  tenantId: string,
  contactId: string,
): Promise<CallerBrief | null> {
  const history = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(calls)
      .where(
        and(
          eq(calls.tenantId, tenantId),
          eq(calls.matchedContactId, contactId),
        ),
      )
      .orderBy(desc(calls.occurredAt))
      .limit(10),
  );
  if (history.length === 0) return null;

  const now = Date.now();
  const withAge = history.map((c: Call) => ({
    call: c,
    daysAgo: Math.floor((now - c.occurredAt.getTime()) / DAY),
  }));
  const last7 = withAge.filter((x) => x.daysAgo <= 7).length;
  const last30 = withAge.filter((x) => x.daysAgo <= 30).length;

  let callPattern: string;
  if (history.length === 1) {
    callPattern = "First call on record";
  } else if (last7 >= 3) {
    callPattern = `${last7} calls in the last 7 days — frequent caller`;
  } else if (last30 >= 5) {
    callPattern = `${last30} calls in the last 30 days — active client`;
  } else if (last30 >= 2) {
    callPattern = `${last30} calls in the last 30 days`;
  } else {
    callPattern = `Last spoke ${daysAgoLabel(withAge[0]!.daysAgo)}`;
  }

  const first = withAge[0]!;
  const lastInteraction = first.call.aiSummary
    ? `${daysAgoLabel(first.daysAgo)} — ${first.call.aiSummary.slice(0, 160)}`
    : `${daysAgoLabel(first.daysAgo)} — ${first.call.direction} call${
        first.call.durationSeconds
          ? ` (${Math.round(first.call.durationSeconds / 60)} min)`
          : ""
      }`;

  const recentCalls = withAge.slice(0, 5).map((x) => ({
    date: x.call.occurredAt.toISOString().slice(0, 10),
    direction: x.call.direction,
    durationSeconds: x.call.durationSeconds,
    summary: x.call.aiSummary,
  }));

  const contactName = first.call.matchedContactName ?? "this client";

  const summaries = withAge
    .map((x) => x.call.aiSummary)
    .filter((s): s is string => Boolean(s))
    .slice(0, 5);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || summaries.length === 0) {
    return {
      contactName,
      lastInteraction,
      callPattern,
      sentiment: summaries.length === 0 ? null : "neutral",
      talkingPoints: [],
      recentCalls,
    };
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Recent call summaries for an insurance-agency client, "${contactName}":

${summaries.map((s, i) => `[${i + 1}] ${s}`).join("\n")}

Reply with EXACTLY this JSON (no markdown): {"sentiment":"positive|neutral|needs-attention","talkingPoints":["...","..."]}
- 2-3 talking points, 10 words max each, drawn from the summaries
- follow up on anything unresolved
- never include phone numbers, SSNs, or policy numbers`,
        },
      ],
    });
    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim()) as {
      sentiment?: string;
      talkingPoints?: unknown;
    };
    const sentiment = (
      ["positive", "neutral", "needs-attention"] as const
    ).includes(parsed.sentiment as "positive")
      ? (parsed.sentiment as CallerBrief["sentiment"])
      : "neutral";
    const talkingPoints = (
      Array.isArray(parsed.talkingPoints) ? parsed.talkingPoints : []
    )
      .map((p) => String(p).slice(0, 120))
      .slice(0, 3);
    return {
      contactName,
      lastInteraction,
      callPattern,
      sentiment,
      talkingPoints,
      recentCalls,
    };
  } catch {
    return {
      contactName,
      lastInteraction,
      callPattern,
      sentiment: "neutral",
      talkingPoints: [],
      recentCalls,
    };
  }
}
