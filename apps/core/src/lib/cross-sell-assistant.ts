import Anthropic from "@anthropic-ai/sdk";
import { listClients, clientDisplayName } from "@/lib/clients";
import { listPolicies } from "@/lib/policies";
import {
  insertAiOpportunities,
  existingOpportunityKeys,
  type CrossSellConfidence,
} from "@/lib/cross-sell";

/**
 * AI cross-sell book analysis.
 *
 * Same safety model as the other Prism Core assistants: the model is given
 * only this tenant's own client/policy summary, and it emits structured
 * opportunity objects through one tool — never SQL, never free-form writes.
 * Trusted code validates every row (clientId must be real, line must be new)
 * and inserts it RLS-scoped. The model cannot reach code or another tenant.
 */

const MODEL = "claude-sonnet-4-6";
/** Cap the book sent to the model so a large agency stays within budget. */
const MAX_CLIENTS = 120;

const CONFIDENCES: CrossSellConfidence[] = ["low", "medium", "high"];

const SYSTEM_PROMPT = `You are the cross-sell analyst for Prism Core, a platform for independent insurance agencies.

You are given one agency's book: each client with the lines of business they ALREADY hold. Your job is to spot the gaps — lines a client almost certainly needs but does not yet have — and record them as cross-sell opportunities.

Strong, common cross-sell patterns:
- Personal Auto without Home/Renters, or vice versa → account rounding.
- Homeowners without Umbrella → high-value homeowners should carry umbrella.
- Homeowners in coastal/flood-prone areas without Flood.
- Commercial clients with General Liability but no Commercial Property, Workers Comp, Commercial Auto, or Cyber.
- Any business without Cyber.
- Life and Disability are near-universal gaps for personal-lines clients.

Rules:
- Only recommend a line the client does NOT already hold.
- Recommend at most the 2 strongest opportunities per client — quality over volume.
- Give a one-sentence, specific rationale for each.
- Estimate an annual premium in whole US dollars — a realistic ballpark.
- Set confidence: high for textbook gaps, medium for likely, low for speculative.
- Call record_opportunities ONCE with every opportunity you found. If the book shows no good opportunities, call it with an empty array.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "record_opportunities",
    description:
      "Record the cross-sell opportunities found across the book. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        opportunities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              clientId: {
                type: "string",
                description: "The clientId from the supplied book — must match.",
              },
              line: {
                type: "string",
                description: 'Recommended line of business, e.g. "Umbrella".',
              },
              rationale: { type: "string" },
              estimatedAnnualPremiumUsd: { type: "number" },
              confidence: {
                type: "string",
                enum: ["low", "medium", "high"],
              },
            },
            required: [
              "clientId",
              "line",
              "rationale",
              "estimatedAnnualPremiumUsd",
              "confidence",
            ],
          },
        },
      },
      required: ["opportunities"],
    },
  },
];

export interface CrossSellGenerationResult {
  created: number;
  analyzed: number;
  error?: string;
}

export async function generateCrossSellOpportunities(
  tenantId: string,
): Promise<CrossSellGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      created: 0,
      analyzed: 0,
      error: "AI book analysis is not configured (no ANTHROPIC_API_KEY).",
    };
  }

  const [clients, policies] = await Promise.all([
    listClients(tenantId),
    listPolicies(tenantId),
  ]);

  // Lines each client already holds (active or quoted policies).
  const linesByClient = new Map<string, Set<string>>();
  for (const p of policies) {
    if (!p.clientId) continue;
    if (p.status === "cancelled" || p.status === "expired") continue;
    const line = p.lineOfBusiness.trim();
    if (!line) continue;
    const set = linesByClient.get(p.clientId) ?? new Set<string>();
    set.add(line);
    linesByClient.set(p.clientId, set);
  }

  // Build the book — clients that hold at least one line are worth analysing.
  const nameById = new Map<string, string>();
  const book: {
    clientId: string;
    name: string;
    state: string;
    currentLines: string[];
  }[] = [];
  for (const c of clients) {
    if (c.status === "inactive") continue;
    const lines = linesByClient.get(c.id);
    if (!lines || lines.size === 0) continue;
    const name = clientDisplayName(c);
    nameById.set(c.id, name);
    book.push({
      clientId: c.id,
      name,
      state: c.state ?? "",
      currentLines: [...lines],
    });
    if (book.length >= MAX_CLIENTS) break;
  }

  if (book.length === 0) {
    return { created: 0, analyzed: 0 };
  }

  const client = new Anthropic({ apiKey });
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      tool_choice: { type: "tool", name: "record_opportunities" },
      messages: [
        {
          role: "user",
          content: `Analyse this book and record the cross-sell opportunities.\n\n${JSON.stringify(
            book,
          )}`,
        },
      ],
    });
  } catch (error) {
    return {
      created: 0,
      analyzed: book.length,
      error:
        error instanceof Error ? error.message : "AI analysis request failed",
    };
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    return { created: 0, analyzed: book.length };
  }

  const raw = (toolUse.input ?? {}) as {
    opportunities?: unknown;
  };
  const proposed = Array.isArray(raw.opportunities) ? raw.opportunities : [];

  // Validate every row before it touches the database.
  const seen = await existingOpportunityKeys(tenantId);
  const currentByClient = new Map(
    book.map((b) => [
      b.clientId,
      new Set(b.currentLines.map((l) => l.toLowerCase())),
    ]),
  );
  const accepted: {
    clientId: string;
    clientName: string;
    line: string;
    rationale: string;
    estimatedPremiumCents: number;
    confidence: CrossSellConfidence;
  }[] = [];

  for (const item of proposed) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const clientId = String(o.clientId ?? "");
    const line = String(o.line ?? "").trim();
    const name = nameById.get(clientId);
    if (!name || !line) continue; // unknown client or empty line
    const key = `${clientId}::${line.toLowerCase()}`;
    if (seen.has(key)) continue; // already an open opportunity
    if (currentByClient.get(clientId)?.has(line.toLowerCase())) continue; // already holds it
    seen.add(key);

    const usd = Number(o.estimatedAnnualPremiumUsd);
    const confidence = CONFIDENCES.includes(o.confidence as CrossSellConfidence)
      ? (o.confidence as CrossSellConfidence)
      : "medium";
    accepted.push({
      clientId,
      clientName: name,
      line,
      rationale: String(o.rationale ?? "").slice(0, 600),
      estimatedPremiumCents:
        Number.isFinite(usd) && usd > 0 ? Math.round(usd * 100) : 0,
      confidence,
    });
  }

  await insertAiOpportunities(tenantId, accepted);
  return { created: accepted.length, analyzed: book.length };
}
