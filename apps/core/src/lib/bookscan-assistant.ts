import Anthropic from "@anthropic-ai/sdk";
import { listClients } from "@/lib/clients";
import { listPolicies } from "@/lib/policies";
import {
  saveBookScanReport,
  type BookScanFinding,
  type BookScanComposition,
} from "@/lib/bookscan";

/**
 * AI book-of-business analysis.
 *
 * The composition (counts and premium by line, carrier, and status) is
 * computed deterministically in trusted code — the model never does the
 * arithmetic. The model only INTERPRETS those aggregates into a narrative and
 * structured findings, returned through one tool. It sees aggregate numbers,
 * not client PII, and writes nothing itself — code saves the report
 * RLS-scoped. Same safety model as the other Prism Core assistants.
 */

const MODEL = "claude-sonnet-4-6";
/** Keep the longest tails out of the model prompt. */
const TOP_N = 12;

const SENTIMENTS: BookScanFinding["sentiment"][] = [
  "positive",
  "watch",
  "risk",
];

const SYSTEM_PROMPT = `You are the book-of-business analyst for Prism Core, a platform for independent insurance agencies.

You are given one agency's book as pre-computed aggregates: total clients and policies, total in-force premium, and the breakdown by line of business, by carrier, and by policy status. The numbers are already correct — do not recompute them, interpret them.

Write for the agency principal. Look for:
- Concentration risk — too much premium in one carrier or one line.
- Portfolio mix — personal vs commercial balance, monoline vs account-rounded.
- Retention signals — share of cancelled/expired policies.
- Growth and cross-sell headroom — low policies-per-client, thin lines.
- Anything notably healthy worth reinforcing.

Call record_analysis ONCE with a 2-4 sentence plain-language summary and 3-7 structured findings. Each finding has a short category, a title, a one-to-two sentence detail, and a sentiment: positive, watch, or risk.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "record_analysis",
    description: "Record the book-of-business analysis. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              title: { type: "string" },
              detail: { type: "string" },
              sentiment: {
                type: "string",
                enum: ["positive", "watch", "risk"],
              },
            },
            required: ["category", "title", "detail", "sentiment"],
          },
        },
      },
      required: ["summary", "findings"],
    },
  },
];

interface Bucket {
  label: string;
  policies: number;
  premiumCents: number;
}

/** Group buckets, keep the top N by premium, lump the rest into "Other". */
function topBuckets(map: Map<string, Bucket>): Bucket[] {
  const all = [...map.values()].sort((a, b) => b.premiumCents - a.premiumCents);
  if (all.length <= TOP_N) return all;
  const top = all.slice(0, TOP_N);
  const rest = all.slice(TOP_N);
  top.push({
    label: `Other (${rest.length})`,
    policies: rest.reduce((s, b) => s + b.policies, 0),
    premiumCents: rest.reduce((s, b) => s + b.premiumCents, 0),
  });
  return top;
}

export interface BookScanResult {
  ok: boolean;
  message: string;
}

export async function runBookScan(
  tenantId: string,
  actorName: string,
): Promise<BookScanResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message: "BookScan is not configured (no ANTHROPIC_API_KEY).",
    };
  }

  const [clients, policies] = await Promise.all([
    listClients(tenantId),
    listPolicies(tenantId),
  ]);

  if (policies.length === 0) {
    return {
      ok: false,
      message: "No policies in the book yet — nothing to analyse.",
    };
  }

  // Deterministic composition — trusted code does all the arithmetic.
  const byLine = new Map<string, Bucket>();
  const byCarrier = new Map<string, Bucket>();
  const byStatus = new Map<string, number>();
  let activePolicies = 0;
  let totalPremiumCents = 0;

  for (const p of policies) {
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
    const inForce = p.status === "active";
    if (inForce) {
      activePolicies++;
      totalPremiumCents += p.premiumCents;
    }
    const lineKey = p.lineOfBusiness.trim() || "Unspecified";
    const carrierKey = p.carrier.trim() || "Unspecified";
    const line = byLine.get(lineKey) ?? {
      label: lineKey,
      policies: 0,
      premiumCents: 0,
    };
    line.policies++;
    if (inForce) line.premiumCents += p.premiumCents;
    byLine.set(lineKey, line);
    const carrier = byCarrier.get(carrierKey) ?? {
      label: carrierKey,
      policies: 0,
      premiumCents: 0,
    };
    carrier.policies++;
    if (inForce) carrier.premiumCents += p.premiumCents;
    byCarrier.set(carrierKey, carrier);
  }

  const composition: BookScanComposition = {
    byLine: topBuckets(byLine),
    byCarrier: topBuckets(byCarrier),
    byStatus: [...byStatus.entries()].map(([label, policies]) => ({
      label,
      policies,
    })),
    activePolicies,
  };

  const aggregates = {
    totalClients: clients.length,
    totalPolicies: policies.length,
    activePolicies,
    totalInForcePremiumUsd: Math.round(totalPremiumCents / 100),
    policiesPerClient:
      clients.length > 0
        ? Number((policies.length / clients.length).toFixed(2))
        : 0,
    byLine: composition.byLine.map((b) => ({
      line: b.label,
      policies: b.policies,
      inForcePremiumUsd: Math.round(b.premiumCents / 100),
    })),
    byCarrier: composition.byCarrier.map((b) => ({
      carrier: b.label,
      policies: b.policies,
      inForcePremiumUsd: Math.round(b.premiumCents / 100),
    })),
    byStatus: composition.byStatus,
  };

  const client = new Anthropic({ apiKey });
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      tool_choice: { type: "tool", name: "record_analysis" },
      messages: [
        {
          role: "user",
          content: `Analyse this book of business.\n\n${JSON.stringify(
            aggregates,
          )}`,
        },
      ],
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "BookScan request failed",
    };
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  const raw = (toolUse?.input ?? {}) as {
    summary?: unknown;
    findings?: unknown;
  };

  const findings: BookScanFinding[] = (
    Array.isArray(raw.findings) ? raw.findings : []
  )
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      category: String(f.category ?? "").slice(0, 80),
      title: String(f.title ?? "").slice(0, 160),
      detail: String(f.detail ?? "").slice(0, 800),
      sentiment: SENTIMENTS.includes(f.sentiment as BookScanFinding["sentiment"])
        ? (f.sentiment as BookScanFinding["sentiment"])
        : "watch",
    }))
    .filter((f) => f.title);

  await saveBookScanReport({
    tenantId,
    generatedBy: actorName,
    totalClients: clients.length,
    totalPolicies: policies.length,
    totalPremiumCents,
    summary: String(raw.summary ?? "").slice(0, 2000),
    findings,
    composition,
  });

  return {
    ok: true,
    message: `Analysed ${policies.length} policies across ${clients.length} clients.`,
  };
}
