/**
 * GEO — Generative Engine Optimization — the AI-answer counterpart to the SEO
 * site audit. Where SEO asks "will this page rank on Google", GEO asks "can an
 * AI assistant reach this site, understand who the business is, and lift a
 * clean answer off the page to cite".
 *
 * Phase 1 is computed from the same crawl the SEO audit already runs — no
 * extra page fetches. Three lenses:
 *   1. Crawler access   — do the AI crawlers (GPTBot, ClaudeBot, …) get in?
 *   2. Schema & entity  — is the business defined in machine-readable schema?
 *   3. Answer-readiness — does each page lead with a citable answer?
 *
 * Live AI-answer monitoring (does ChatGPT actually name you) is phase 2 and
 * already exists separately in seo-visibility.ts.
 */

/* ── Types ────────────────────────────────────────────────────────── */

export interface GeoPageSignal {
  url: string;
  /** 0–100 answer-readiness for this page. */
  answerScore: number;
  /** First substantive paragraph reads as a direct, liftable answer. */
  leadsWithAnswer: boolean;
  /** Section headings phrased as questions (what AI answer engines match on). */
  questionHeadings: number;
  /** Contains citable specifics — numbers, percentages, dollar figures, quotes. */
  hasStats: boolean;
  /** Has an extractable list (bulleted/numbered). */
  hasList: boolean;
  /** schema.org @type values found in JSON-LD on this page. */
  schemaTypes: string[];
}

export interface GeoBotAccess {
  name: string;
  /** true = explicitly allowed / not blocked, false = blocked, null = site has no robots.txt. */
  allowed: boolean | null;
}

export interface GeoReport {
  score: number;
  crawler: {
    robotsFound: boolean;
    llmsTxt: boolean;
    bots: GeoBotAccess[];
    blocked: string[];
  };
  schema: {
    organization: boolean;
    localBusiness: boolean;
    faq: boolean;
    article: boolean;
    breadcrumb: boolean;
    hasNap: boolean;
    pagesWithSchema: number;
    pagesTotal: number;
  };
  answerReadiness: {
    avg: number;
    pagesLeadingWithAnswer: number;
    pagesWithQuestionHeadings: number;
    pagesWithStats: number;
  };
  findings: { title: string; detail: string; impact: "high" | "medium" | "low" }[];
  /** Lowest answer-readiness pages, worst first. */
  worstPages: { url: string; answerScore: number; notes: string[] }[];
}

/* ── The AI crawlers we care about ────────────────────────────────── */

const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
] as const;

/* ── JSON-LD extraction ───────────────────────────────────────────── */

function collectTypes(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") out.add(t);
  else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.add(x);
  for (const key of ["@graph", "mainEntity", "itemListElement", "author", "publisher"]) {
    if (obj[key]) collectTypes(obj[key], out);
  }
}

function schemaTypesFrom(html: string): string[] {
  const out = new Set<string>();
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[1] || "").trim();
    if (!raw) continue;
    try {
      collectTypes(JSON.parse(raw), out);
    } catch {
      // Some sites emit slightly malformed JSON-LD; fall back to a type regex.
      for (const t of raw.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) out.add(t[1]!);
    }
  }
  return [...out];
}

/** Does any Organization/LocalBusiness node carry name + address + phone (NAP)? */
export function hasNapSchema(html: string): boolean {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  let found = false;
  const check = (node: unknown): void => {
    if (found || !node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(check);
    const o = node as Record<string, unknown>;
    const t = o["@type"];
    const types = typeof t === "string" ? [t] : Array.isArray(t) ? t : [];
    if (types.some((x) => /Organization|LocalBusiness|InsuranceAgency/i.test(String(x)))) {
      if (o.name && (o.address || o.location) && (o.telephone || o.contactPoint)) found = true;
    }
    for (const v of Object.values(o)) if (typeof v === "object") check(v);
  };
  while ((m = re.exec(html)) !== null) {
    try {
      check(JSON.parse((m[1] || "").trim()));
    } catch {
      /* ignore */
    }
    if (found) break;
  }
  return found;
}

/* ── Per-page answer-readiness ────────────────────────────────────── */

function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const QUESTION_RE =
  /^\s*(who|what|why|how|when|where|which|can|do|does|is|are|should|will)\b|\?\s*$/i;

export function analyzeGeoPage(url: string, html: string): GeoPageSignal {
  // Question-phrased section headings (H2/H3).
  let questionHeadings = 0;
  for (const m of html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)) {
    const t = (m[1] ?? "").replace(/<[^>]+>/g, "").trim();
    if (t && QUESTION_RE.test(t)) questionHeadings++;
  }

  // Direct-answer lead: the first real paragraph is short and declarative
  // (a liftable sentence), not a marketing run-on or a question.
  let leadsWithAnswer = false;
  const firstP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (firstP) {
    const t = (firstP[1] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (t.length >= 40 && t.length <= 360 && !/\?\s*$/.test(t)) leadsWithAnswer = true;
  }

  const body = textOf(html);
  const hasStats =
    /\b\d+(\.\d+)?\s?%/.test(body) || // percentages
    /\$\s?\d/.test(body) || // dollar figures
    /<blockquote/i.test(html) || // quotes
    /\b(19|20)\d{2}\b/.test(body) && /\b\d{2,}\b/.test(body); // years + counts
  const hasList = /<(ul|ol)\b[^>]*>[\s\S]*?<li\b/i.test(html);
  const schemaTypes = schemaTypesFrom(html);

  let score = 0;
  if (leadsWithAnswer) score += 30;
  else notes.push("No direct-answer opening line");
  if (questionHeadings > 0) score += 25;
  else notes.push("No question-style headings");
  if (hasStats) score += 20;
  else notes.push("No citable stats or quotes");
  if (hasList) score += 15;
  else notes.push("No extractable list");
  if (schemaTypes.length > 0) score += 10;
  else notes.push("No structured data");

  return {
    url,
    answerScore: Math.min(100, score),
    leadsWithAnswer,
    questionHeadings,
    hasStats,
    hasList,
    schemaTypes,
  };
}

/* ── Crawler access from robots.txt ───────────────────────────────── */

/**
 * For each AI bot, decide whether it's blocked. Blocked = a `Disallow: /`
 * under that bot's own User-agent group, or under the `*` group. A missing
 * robots.txt means every bot is allowed by default (allowed=true, but we
 * flag robotsFound=false separately).
 */
export function parseCrawlerAccess(
  robotsText: string,
  robotsFound: boolean,
): GeoBotAccess[] {
  // Group Disallow lines by user-agent.
  const groups = new Map<string, string[]>();
  let current: string[] = [];
  for (const rawLine of robotsText.split("\n")) {
    const line = rawLine.split("#")[0]!.trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      const ua = value.toLowerCase();
      if (!groups.has(ua)) groups.set(ua, []);
      current = groups.get(ua)!;
    } else if (key === "disallow") {
      current.push(value);
    }
  }
  const blocksRoot = (ua: string): boolean => {
    const rules = groups.get(ua.toLowerCase());
    if (!rules) return false;
    return rules.some((r) => r === "/" || r === "/*");
  };
  const starBlocks = blocksRoot("*");

  return AI_BOTS.map((name) => {
    if (!robotsFound) return { name, allowed: null };
    const mentioned = groups.has(name.toLowerCase());
    const blocked = blocksRoot(name) || (!mentioned && starBlocks);
    return { name, allowed: !blocked };
  });
}

/* ── Assembly ─────────────────────────────────────────────────────── */

const MAJOR_BOTS = new Set(["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]);

export function buildGeoReport(
  pageSignals: GeoPageSignal[],
  opts: { robotsText: string; robotsFound: boolean; llmsTxt: boolean; napHtmlSample: boolean },
): GeoReport {
  const bots = parseCrawlerAccess(opts.robotsText, opts.robotsFound);
  const blocked = bots.filter((b) => b.allowed === false).map((b) => b.name);
  const blockedMajor = blocked.filter((n) => MAJOR_BOTS.has(n));

  const allTypes = new Set<string>();
  let pagesWithSchema = 0;
  for (const p of pageSignals) {
    if (p.schemaTypes.length) pagesWithSchema++;
    for (const t of p.schemaTypes) allTypes.add(t.toLowerCase());
  }
  const has = (re: RegExp) => [...allTypes].some((t) => re.test(t));
  const schema = {
    organization: has(/organization/),
    localBusiness: has(/localbusiness|insuranceagency/),
    faq: has(/faqpage|qapage/),
    article: has(/article|blogposting|newsarticle/),
    breadcrumb: has(/breadcrumblist/),
    hasNap: opts.napHtmlSample,
    pagesWithSchema,
    pagesTotal: pageSignals.length,
  };

  const n = pageSignals.length || 1;
  const answerReadiness = {
    avg: Math.round(pageSignals.reduce((s, p) => s + p.answerScore, 0) / n),
    pagesLeadingWithAnswer: pageSignals.filter((p) => p.leadsWithAnswer).length,
    pagesWithQuestionHeadings: pageSignals.filter((p) => p.questionHeadings > 0).length,
    pagesWithStats: pageSignals.filter((p) => p.hasStats).length,
  };

  // Score: crawler access 25, schema/entity 25, answer-readiness 40, llms.txt 10.
  let crawlerPts = 25;
  crawlerPts -= blockedMajor.length * 8;
  crawlerPts = Math.max(0, crawlerPts);

  let schemaPts = 0;
  if (schema.organization || schema.localBusiness) schemaPts += 10;
  if (schema.hasNap) schemaPts += 5;
  if (schema.faq) schemaPts += 5;
  if (schema.article) schemaPts += 5;
  schemaPts = Math.min(25, schemaPts);

  const answerPts = Math.round((answerReadiness.avg / 100) * 40);
  const llmsPts = opts.llmsTxt ? 10 : 0;
  const score = Math.max(0, Math.min(100, crawlerPts + schemaPts + answerPts + llmsPts));

  // Findings.
  const findings: GeoReport["findings"] = [];
  if (blockedMajor.length > 0) {
    findings.push({
      impact: "high",
      title: `AI crawlers blocked: ${blockedMajor.join(", ")}`,
      detail:
        "Your robots.txt tells these AI assistants to stay out, so they can't read your site to answer questions about you. Allow them unless you have a specific reason not to.",
    });
  }
  if (!schema.organization && !schema.localBusiness) {
    findings.push({
      impact: "high",
      title: "No Organization / business schema found",
      detail:
        "Nothing on the site tells AI models, in machine-readable form, who this business is. Add Organization (or LocalBusiness / InsuranceAgency) structured data with your name, address, and phone.",
    });
  } else if (!schema.hasNap) {
    findings.push({
      impact: "medium",
      title: "Business schema is missing name/address/phone",
      detail:
        "You have Organization schema but it's missing a complete address or phone number — the details AI answers cite when recommending a local agency.",
    });
  }
  if (!schema.faq) {
    findings.push({
      impact: "medium",
      title: "No FAQ schema",
      detail:
        "FAQ structured data feeds question-and-answer content straight to AI assistants and Google's AI Overviews. Add it to your most-asked-questions pages.",
    });
  }
  if (answerReadiness.avg < 55) {
    findings.push({
      impact: "high",
      title: "Pages aren't answer-ready",
      detail:
        "Most pages don't open with a clear, liftable answer or use question-style headings, so AI engines have nothing clean to quote. Lead each page with a one-sentence direct answer and add question headings.",
    });
  } else if (answerReadiness.pagesWithQuestionHeadings < pageSignals.length / 3) {
    findings.push({
      impact: "medium",
      title: "Few question-style headings",
      detail:
        "AI answer engines match content to how people phrase questions. Turn some section headings into the actual questions your clients ask.",
    });
  }
  if (!opts.llmsTxt) {
    findings.push({
      impact: "low",
      title: "No llms.txt file",
      detail:
        "llms.txt is an emerging standard — a plain-text guide that points AI models at your most important pages. It's optional today but cheap to add and forward-looking.",
    });
  }

  const worstPages = [...pageSignals]
    .sort((a, b) => a.answerScore - b.answerScore)
    .slice(0, 15)
    .map((p) => ({
      url: p.url,
      answerScore: p.answerScore,
      notes: [
        !p.leadsWithAnswer ? "no direct-answer opening" : null,
        p.questionHeadings === 0 ? "no question headings" : null,
        !p.hasStats ? "no citable stats" : null,
        p.schemaTypes.length === 0 ? "no schema" : null,
      ].filter(Boolean) as string[],
    }));

  return {
    score,
    crawler: { robotsFound: opts.robotsFound, llmsTxt: opts.llmsTxt, bots, blocked },
    schema,
    answerReadiness,
    findings,
    worstPages,
  };
}
