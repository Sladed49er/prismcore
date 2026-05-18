import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { withTenantContext, calls, type Call } from "@prismcore/db";

/**
 * Client Risk Radar — ported from CallIntel. Watches call patterns across a
 * tenant's clients and flags at-risk accounts.
 *
 * Scoring is deterministic in trusted code: call frequency, missed calls,
 * very-short calls, and total volume each add points. The top-risk accounts
 * are then optionally enhanced with a one-word AI sentiment read of their
 * recent call summaries. Computed on demand from the call log — nothing is
 * stored.
 */

const MODEL = "claude-haiku-4-5-20251001";
const DAY = 86_400_000;

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskAssessment {
  contactId: string;
  contactName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  factors: string[];
  recommendedAction: string;
  callCount30d: number;
  missedCalls30d: number;
  lastCallDate: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
}

function levelFor(score: number): RiskLevel {
  if (score >= 60) return "critical";
  if (score >= 40) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function actionFor(level: RiskLevel): string {
  switch (level) {
    case "critical":
      return "Immediate outreach — schedule a review call with the client.";
    case "high":
      return "Proactive call recommended — address outstanding concerns.";
    case "medium":
      return "Follow up on recent interactions — make sure issues are resolved.";
    default:
      return "Monitor — no immediate action needed.";
  }
}

const isMissed = (c: Call): boolean =>
  c.status === "missed" || c.status === "voicemail";

/**
 * Compute risk assessments for every client with recent matched calls.
 * Returns the top 50 by score; when `enhanceAi` is set (and an API key is
 * configured) the top 10 are enriched with a one-word AI sentiment read.
 */
export async function computeRiskRadar(
  tenantId: string,
  enhanceAi = true,
): Promise<RiskAssessment[]> {
  const cutoff = new Date(Date.now() - 60 * DAY);
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(calls)
      .where(
        and(
          eq(calls.tenantId, tenantId),
          isNotNull(calls.matchedContactId),
          gte(calls.occurredAt, cutoff),
        ),
      )
      .orderBy(desc(calls.occurredAt)),
  );

  // Group the call log by matched contact.
  const byContact = new Map<string, Call[]>();
  for (const c of rows) {
    const key = c.matchedContactId!;
    const existing = byContact.get(key);
    if (existing) existing.push(c);
    else byContact.set(key, [c]);
  }

  const now = Date.now();
  const assessments: RiskAssessment[] = [];

  for (const [contactId, contactCalls] of byContact) {
    const last7d = contactCalls.filter(
      (c) => now - c.occurredAt.getTime() < 7 * DAY,
    );
    const last30d = contactCalls.filter(
      (c) => now - c.occurredAt.getTime() < 30 * DAY,
    );
    const missed = last30d.filter(isMissed);
    const shortCalls = last30d.filter(
      (c) => c.status === "completed" && c.durationSeconds < 30,
    );

    let score = 0;
    const factors: string[] = [];

    if (last7d.length >= 4) {
      score += 30;
      factors.push(`${last7d.length} calls in the last 7 days — very high frequency`);
    } else if (last7d.length >= 3) {
      score += 20;
      factors.push(`${last7d.length} calls this week — above average`);
    }
    if (missed.length >= 3) {
      score += 25;
      factors.push(`${missed.length} missed calls this month — the client may feel ignored`);
    } else if (missed.length >= 2) {
      score += 15;
      factors.push(`${missed.length} missed calls this month`);
    }
    if (shortCalls.length >= 2) {
      score += 15;
      factors.push(`${shortCalls.length} very short calls — possible frustration`);
    }
    if (last30d.length >= 8) {
      score += 15;
      factors.push(`${last30d.length} calls this month — a high-touch client`);
    }

    if (score < 10 && factors.length === 0) continue;

    const level = levelFor(score);
    assessments.push({
      contactId,
      contactName: contactCalls[0]!.matchedContactName ?? "Unknown client",
      riskLevel: level,
      riskScore: Math.min(score, 100),
      factors,
      recommendedAction: actionFor(level),
      callCount30d: last30d.length,
      missedCalls30d: missed.length,
      lastCallDate: contactCalls[0]!.occurredAt.toISOString().slice(0, 10),
      sentiment: null,
    });
  }

  assessments.sort((a, b) => b.riskScore - a.riskScore);
  const top = assessments.slice(0, 50);

  if (enhanceAi) await enhanceWithSentiment(top, byContact);
  return top;
}

/** AI sentiment read of the top-10 at-risk accounts' recent call summaries. */
async function enhanceWithSentiment(
  assessments: RiskAssessment[],
  byContact: Map<string, Call[]>,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;
  const client = new Anthropic({ apiKey });

  for (const a of assessments.slice(0, 10)) {
    const summaries = (byContact.get(a.contactId) ?? [])
      .map((c) => c.aiSummary)
      .filter((s): s is string => Boolean(s))
      .slice(0, 5)
      .join("\n");
    if (!summaries) continue;

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 16,
        messages: [
          {
            role: "user",
            content: `These are recent call summaries for one insurance client. Reply with ONE word — positive, neutral, or negative.\n\n${summaries.slice(0, 2000)}`,
          },
        ],
      });
      const word =
        response.content[0]?.type === "text"
          ? response.content[0].text.trim().toLowerCase()
          : "";
      if (word.includes("negative")) {
        a.sentiment = "negative";
        a.riskScore = Math.min(a.riskScore + 20, 100);
        a.factors.push("Negative sentiment detected in recent calls");
        a.riskLevel = levelFor(a.riskScore);
        a.recommendedAction = actionFor(a.riskLevel);
      } else if (word.includes("positive")) {
        a.sentiment = "positive";
      } else {
        a.sentiment = "neutral";
      }
    } catch {
      // Sentiment is best-effort — leave it null on error.
    }
  }
  assessments.sort((x, y) => y.riskScore - x.riskScore);
}
