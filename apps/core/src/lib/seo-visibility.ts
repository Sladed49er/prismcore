import Anthropic from "@anthropic-ai/sdk";
import {
  listSeoKeywords,
  getSeoSettings,
  recordSeoVisibilityCheck,
} from "@/lib/seo";

/**
 * The AI visibility tracker (AEO/GEO).
 *
 * For each tracked keyword, ask an AI answer engine the question a prospect
 * would ask — Claude with live web search, so the answer reflects what AI
 * search actually surfaces — then detect deterministically whether the
 * organization was part of the answer: its site appears in the cited
 * sources, or its name appears in the answer text. Results append to
 * `seo_visibility_checks`, building the visibility time series.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_QUERIES_PER_RUN = 10;
const SEARCHES_PER_QUERY = 3;

export interface VisibilityResult {
  query: string;
  mentioned: boolean;
  excerpt: string;
}

export interface VisibilityRun {
  checked: number;
  mentions: number;
  results: VisibilityResult[];
}

/** Ask the engine one question and detect whether the org is in the answer. */
export async function checkOneQuery(input: {
  query: string;
  orgName: string;
  siteHost: string;
}): Promise<VisibilityResult> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You are a general-purpose AI assistant answering a user's question. Search the web and answer naturally and concisely, naming the specific organizations, companies, or resources you would actually recommend.",
    messages: [{ role: "user", content: input.query }],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: SEARCHES_PER_QUERY,
      },
    ],
  });

  const answerText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  // Everything the engine saw or cited — catches source URLs even when the
  // prose paraphrases.
  const raw = JSON.stringify(response.content).toLowerCase();
  const host = input.siteHost.toLowerCase().replace(/^www\./, "");
  const name = input.orgName.trim().toLowerCase();

  const hostCited = host.length > 0 && raw.includes(host);
  const nameInAnswer =
    name.length > 2 && answerText.toLowerCase().includes(name);
  const mentioned = hostCited || nameInAnswer;

  let excerpt = "";
  if (nameInAnswer) {
    const idx = answerText.toLowerCase().indexOf(name);
    excerpt = answerText
      .slice(Math.max(0, idx - 120), idx + name.length + 160)
      .trim();
  } else {
    excerpt = answerText.slice(0, 280).trim();
  }
  if (excerpt.length >= 280) excerpt = `…${excerpt}…`;

  return { query: input.query, mentioned, excerpt };
}

/** Run visibility checks for a tenant's tracked keywords and persist them. */
export async function runTenantVisibilityChecks(input: {
  tenantId: string;
  tenantName: string;
}): Promise<VisibilityRun> {
  const [keywords, settings] = await Promise.all([
    listSeoKeywords(input.tenantId),
    getSeoSettings(input.tenantId),
  ]);
  const tracked = keywords
    .filter((k) => k.status === "tracked")
    .slice(0, MAX_QUERIES_PER_RUN);

  let siteHost = "";
  try {
    siteHost = settings?.siteUrl ? new URL(settings.siteUrl).hostname : "";
  } catch {
    // A malformed site URL just means we detect by name only.
  }

  const run: VisibilityRun = { checked: 0, mentions: 0, results: [] };
  for (const keyword of tracked) {
    try {
      const result = await checkOneQuery({
        query: keyword.phrase,
        orgName: input.tenantName,
        siteHost,
      });
      await recordSeoVisibilityCheck({
        tenantId: input.tenantId,
        query: result.query,
        engine: "claude",
        mentioned: result.mentioned,
        excerpt: result.excerpt,
      });
      run.checked++;
      if (result.mentioned) run.mentions++;
      run.results.push(result);
    } catch {
      // One failed query shouldn't sink the run — the next keyword still counts.
    }
  }
  return run;
}
