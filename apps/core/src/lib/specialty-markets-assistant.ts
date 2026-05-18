import Anthropic from "@anthropic-ai/sdk";
import { listSpecialtyMarkets } from "@/lib/specialty-markets";

/**
 * AI specialty-market matching.
 *
 * Given a described risk, the model ranks the agency's own market repository
 * by fit. Same safety model as the other Prism Core assistants: the model
 * sees only this tenant's markets, emits structured rankings through one tool
 * (never SQL, never writes), and trusted code validates every marketId before
 * surfacing it. This is a read-only feature — nothing is persisted.
 */

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are the specialty-market matcher for Prism Core, a platform for independent insurance agencies.

You are given a described hard-to-place risk and the agency's repository of specialty markets (MGAs, wholesalers, surplus-lines carriers, programs) with each market's appetite, lines of business, and states.

Rank the markets that genuinely fit the risk. Consider line of business, the appetite description, and state availability. Do not invent markets — only rank ones from the supplied repository. Omit markets that clearly do not fit rather than padding the list.

Score fit 1-5: 5 = squarely in appetite, 3 = plausible, 1 = long shot. Give a one-sentence reason for each. Call rank_markets ONCE with your ranked list (best first); if nothing fits, call it with an empty array.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "rank_markets",
    description:
      "Return the specialty markets that fit the risk, ranked best-first. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              marketId: {
                type: "string",
                description: "The marketId from the supplied repository.",
              },
              fitScore: {
                type: "integer",
                description: "1 (long shot) to 5 (squarely in appetite).",
              },
              reasoning: { type: "string" },
            },
            required: ["marketId", "fitScore", "reasoning"],
          },
        },
      },
      required: ["matches"],
    },
  },
];

export interface MarketMatch {
  marketId: string;
  marketName: string;
  marketType: string;
  fitScore: number;
  reasoning: string;
}

export interface MarketMatchResult {
  matches: MarketMatch[];
  /** How many active markets were considered. */
  analyzed: number;
  error?: string;
}

export async function matchSpecialtyMarkets(
  tenantId: string,
  riskDescription: string,
): Promise<MarketMatchResult> {
  const risk = riskDescription.trim();
  if (!risk) {
    return { matches: [], analyzed: 0, error: "Describe the risk first." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      matches: [],
      analyzed: 0,
      error: "AI market matching is not configured (no ANTHROPIC_API_KEY).",
    };
  }

  const markets = (await listSpecialtyMarkets(tenantId)).filter(
    (m) => m.isActive,
  );
  if (markets.length === 0) {
    return {
      matches: [],
      analyzed: 0,
      error: "No active markets in the repository to match against.",
    };
  }

  const byId = new Map(markets.map((m) => [m.id, m]));
  const repository = markets.map((m) => ({
    marketId: m.id,
    name: m.name,
    type: m.marketType,
    appetite: m.appetite,
    linesOfBusiness: m.linesOfBusiness,
    states: m.states,
  }));

  const client = new Anthropic({ apiKey });
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      tool_choice: { type: "tool", name: "rank_markets" },
      messages: [
        {
          role: "user",
          content: `Risk to place:\n${risk}\n\nMarket repository:\n${JSON.stringify(
            repository,
          )}`,
        },
      ],
    });
  } catch (error) {
    return {
      matches: [],
      analyzed: markets.length,
      error:
        error instanceof Error ? error.message : "AI match request failed",
    };
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  const raw = (toolUse?.input ?? {}) as { matches?: unknown };
  const proposed = Array.isArray(raw.matches) ? raw.matches : [];

  const matches: MarketMatch[] = [];
  for (const item of proposed) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const market = byId.get(String(o.marketId ?? ""));
    if (!market) continue; // hallucinated id — drop it
    const score = Number(o.fitScore);
    matches.push({
      marketId: market.id,
      marketName: market.name,
      marketType: market.marketType,
      fitScore: Number.isFinite(score) ? Math.min(5, Math.max(1, score)) : 3,
      reasoning: String(o.reasoning ?? "").slice(0, 600),
    });
  }
  matches.sort((a, b) => b.fitScore - a.fitScore);

  return { matches, analyzed: markets.length };
}
