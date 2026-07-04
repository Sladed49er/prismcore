import Anthropic from "@anthropic-ai/sdk";

/**
 * The SEO audit engine — one-off, on-demand checks against any public URL.
 *
 * Two layers: deterministic on-page checks (title, meta, headings, alt text,
 * canonical, Open Graph, word count) computed from the fetched HTML, then a
 * Claude pass that turns the raw signals into a short prioritized list of
 * suggestions. Shared by the SEO Engine module (authenticated) and the public
 * PrismSEO page (rate-limited).
 */

const MODEL = "claude-sonnet-4-6";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 1_500_000;

export type AuditStatus = "pass" | "warn" | "fail";

export interface AuditCheck {
  id: string;
  label: string;
  status: AuditStatus;
  detail: string;
}

export interface AuditReport {
  url: string;
  fetched: boolean;
  /** Set when the page could not be fetched. */
  error?: string;
  checks: AuditCheck[];
  /** Claude's prioritized suggestions; empty if the AI pass was skipped. */
  suggestions: string[];
}

/** Reject anything that is not a plain public http(s) URL (SSRF guard). */
export function validateAuditUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    throw new Error("That does not look like a valid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http(s) URLs can be audited.");
  }
  const host = url.hostname.toLowerCase();
  const isIpV4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const privateIpV4 =
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      host,
    );
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.includes(":") || // IPv6 literal
    (isIpV4 && privateIpV4)
  ) {
    throw new Error("Only public websites can be audited.");
  }
  return url;
}

/** Decode the entities that show up in titles/metas so length checks
 *  measure what users and Google actually see ("&amp;" is 1 char, not 5). */
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extract(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return decodeEntities(match?.[1]?.trim() ?? "");
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface PageSignals {
  title: string;
  metaDescription: string;
  canonical: string;
  h1s: string[];
  h2Count: number;
  imgCount: number;
  imgMissingAlt: number;
  hasOgTitle: boolean;
  hasOgImage: boolean;
  hasViewport: boolean;
  wordCount: number;
  https: boolean;
  textExcerpt: string;
}

export function analyze(url: URL, html: string): PageSignals {
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    stripTags(m[1] ?? "").slice(0, 120),
  );
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imgMissingAlt = imgTags.filter(
    (tag) => !/\balt\s*=\s*("[^"]+"|'[^']+')/i.test(tag),
  ).length;
  const text = stripTags(html);
  return {
    title: extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    metaDescription: extract(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    ) ||
      extract(
        html,
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
      ),
    canonical: extract(
      html,
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i,
    ),
    h1s,
    h2Count: countMatches(html, /<h2[\s>]/gi),
    imgCount: imgTags.length,
    imgMissingAlt,
    hasOgTitle: /<meta[^>]+property=["']og:title["']/i.test(html),
    hasOgImage: /<meta[^>]+property=["']og:image["']/i.test(html),
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    wordCount: text ? text.split(" ").length : 0,
    https: url.protocol === "https:",
    textExcerpt: text.slice(0, 1500),
  };
}

export function buildChecks(signals: PageSignals): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const push = (
    id: string,
    label: string,
    status: AuditStatus,
    detail: string,
  ) => checks.push({ id, label, status, detail });

  if (!signals.title) {
    push("title", "Title tag", "fail", "The page has no <title>.");
  } else if (signals.title.length < 15 || signals.title.length > 65) {
    push(
      "title",
      "Title tag",
      "warn",
      `"${signals.title.slice(0, 80)}" is ${signals.title.length} characters — aim for 15-65.`,
    );
  } else {
    push("title", "Title tag", "pass", `"${signals.title.slice(0, 80)}"`);
  }

  if (!signals.metaDescription) {
    push(
      "meta",
      "Meta description",
      "fail",
      "Missing — search engines will improvise a snippet.",
    );
  } else if (
    signals.metaDescription.length < 70 ||
    signals.metaDescription.length > 165
  ) {
    push(
      "meta",
      "Meta description",
      "warn",
      `${signals.metaDescription.length} characters — aim for 70-165.`,
    );
  } else {
    push("meta", "Meta description", "pass", "Present and well-sized.");
  }

  if (signals.h1s.length === 0) {
    push("h1", "H1 heading", "fail", "No H1 on the page.");
  } else if (signals.h1s.length > 1) {
    push(
      "h1",
      "H1 heading",
      "warn",
      `${signals.h1s.length} H1s found — use exactly one.`,
    );
  } else {
    push("h1", "H1 heading", "pass", `"${signals.h1s[0]}"`);
  }

  if (signals.imgCount > 0 && signals.imgMissingAlt > 0) {
    push(
      "alt",
      "Image alt text",
      signals.imgMissingAlt > signals.imgCount / 2 ? "fail" : "warn",
      `${signals.imgMissingAlt} of ${signals.imgCount} images have no alt text.`,
    );
  } else {
    push(
      "alt",
      "Image alt text",
      "pass",
      signals.imgCount === 0
        ? "No images on the page."
        : "Every image has alt text.",
    );
  }

  push(
    "canonical",
    "Canonical URL",
    signals.canonical ? "pass" : "warn",
    signals.canonical || "No canonical link — risks duplicate-content dilution.",
  );

  push(
    "og",
    "Social sharing tags",
    signals.hasOgTitle && signals.hasOgImage
      ? "pass"
      : signals.hasOgTitle || signals.hasOgImage
        ? "warn"
        : "fail",
    signals.hasOgTitle && signals.hasOgImage
      ? "Open Graph title and image present."
      : "Missing Open Graph tags — links will preview poorly when shared.",
  );

  push(
    "viewport",
    "Mobile viewport",
    signals.hasViewport ? "pass" : "fail",
    signals.hasViewport
      ? "Viewport meta present."
      : "No viewport meta — the page will render zoomed-out on phones.",
  );

  push(
    "https",
    "HTTPS",
    signals.https ? "pass" : "fail",
    signals.https ? "Served over HTTPS." : "Not HTTPS — a direct ranking factor.",
  );

  if (signals.wordCount < 150) {
    push(
      "content",
      "Content depth",
      "warn",
      `Only ~${signals.wordCount} words of visible text — thin pages rarely rank.`,
    );
  } else {
    push(
      "content",
      "Content depth",
      "pass",
      `~${signals.wordCount} words of visible text.`,
    );
  }

  return checks;
}

const SUGGESTIONS_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: { type: "string" },
      description:
        "3-6 prioritized, specific suggestions. Each one sentence, most impactful first.",
    },
  },
  required: ["suggestions"],
};

async function suggest(
  url: string,
  signals: PageSignals,
  checks: AuditCheck[],
): Promise<string[]> {
  const anthropic = new Anthropic();
  const findings = checks
    .filter((c) => c.status !== "pass")
    .map((c) => `- ${c.label}: ${c.detail}`)
    .join("\n");
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "You are an SEO consultant. Given a page's on-page signals and failed checks, return a short prioritized list of concrete improvements. Be specific to THIS page — reference its actual title and content. Never invent facts about the business.",
    messages: [
      {
        role: "user",
        content: `Page: ${url}
Title: ${signals.title || "(none)"}
Meta description: ${signals.metaDescription || "(none)"}
H1s: ${signals.h1s.join(" | ") || "(none)"}
Word count: ~${signals.wordCount}

Failed or warned checks:
${findings || "(all checks passed)"}

Page text excerpt:
${signals.textExcerpt}`,
      },
    ],
    tools: [
      {
        name: "save_suggestions",
        description: "Save the prioritized suggestions.",
        input_schema: SUGGESTIONS_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_suggestions" },
  });
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  const input = toolUse?.input as { suggestions?: string[] } | undefined;
  return (input?.suggestions ?? []).slice(0, 6);
}

/** Run the full audit. `withAi: false` skips the Claude pass (checks only). */
export async function runSeoAudit(
  rawUrl: string,
  options: { withAi?: boolean } = {},
): Promise<AuditReport> {
  const url = validateAuditUrl(rawUrl);

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "PrismSEO-Audit/1.0 (+https://prismams.com)" },
    });
    clearTimeout(timer);
    if (!response.ok) {
      return {
        url: url.href,
        fetched: false,
        error: `The page returned HTTP ${response.status}.`,
        checks: [],
        suggestions: [],
      };
    }
    html = (await response.text()).slice(0, MAX_HTML_BYTES);
  } catch {
    return {
      url: url.href,
      fetched: false,
      error: "The page could not be fetched — is the site up?",
      checks: [],
      suggestions: [],
    };
  }

  const signals = analyze(url, html);
  const checks = buildChecks(signals);

  let suggestions: string[] = [];
  if (options.withAi !== false) {
    try {
      suggestions = await suggest(url.href, signals, checks);
    } catch {
      // The deterministic report stands on its own if the AI pass fails.
    }
  }

  return { url: url.href, fetched: true, checks, suggestions };
}
