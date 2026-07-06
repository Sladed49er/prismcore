import Anthropic from "@anthropic-ai/sdk";
import {
  analyze,
  buildChecks,
  validateAuditUrl,
  type AuditCheck,
} from "@/lib/seo-audit";

/**
 * The deep site audit — crawls a whole site and grades it.
 *
 * Discovery: robots.txt (+ its Sitemap: lines) and sitemap.xml seed the
 * queue; a same-origin BFS over <a href> links fills the rest. Every crawled
 * page runs the deterministic per-page checks from seo-audit plus deep
 * signals (noindex, structured data, html lang). Site-level passes find
 * duplicate titles/descriptions, broken internal links, and HTTP/www
 * redirect problems. One Claude call at the end turns the aggregate into an
 * executive summary and a prioritized action plan.
 *
 * Built for a single serverless invocation: concurrency pool and a hard
 * time budget under the route's maxDuration (page count is uncapped short
 * of the runaway guard — the clock is the limiter).
 */

const MODEL = "claude-sonnet-4-6";
// No page cap by design — the time budget is the real limiter. MAX_PAGES is
// only a runaway guard against infinite URL spaces (calendars, faceted nav).
const MAX_PAGES = 5_000;
const MAX_LINK_CHECKS = 500;
const CONCURRENCY = 10;
const PAGE_TIMEOUT_MS = 8_000;
const LINK_TIMEOUT_MS = 6_000;
// Interactive audits run under maxDuration=800 (Pro + Fluid Compute); leave
// ~100s of headroom for the link checks tail, the AI pass, and serialization.
const TIME_BUDGET_MS = 700_000;
const MAX_HTML_BYTES = 1_500_000;
const UA = "PrismOptimize-SiteAudit/1.0 (+https://prismoptimize.com)";
// The report stores pages with findings (worst-first); clean pages are
// aggregate-only. Keeps the jsonb row and the action-response payload sane
// on multi-thousand-page crawls.
const MAX_REPORT_PAGES = 300;

export interface DeepAuditOptions {
  /** Crawl+link-check budget in ms. Callers on a tighter maxDuration (the
      weekly monitor cron) pass a smaller budget. */
  timeBudgetMs?: number;
  /** Runaway guard override — the monitor cron keeps the old 75. */
  maxPages?: number;
}

const SKIP_EXTENSIONS =
  /\.(pdf|jpe?g|png|gif|svg|webp|avif|ico|css|js|mjs|json|xml|txt|zip|gz|docx?|xlsx?|pptx?|mp3|mp4|webm|mov|woff2?|ttf)$/i;

export interface SitePageResult {
  url: string;
  status: number;
  ok: boolean;
  title: string;
  wordCount: number;
  noindex: boolean;
  hasStructuredData: boolean;
  failCount: number;
  warnCount: number;
  /** Failed and warned checks only — passes are noise at site scale. */
  findings: AuditCheck[];
}

export interface SiteIssueGroup {
  value: string;
  urls: string[];
}

export interface BrokenLink {
  url: string;
  status: number;
  foundOn: string;
}

export interface SiteAction {
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
}

export interface SiteAuditReport {
  root: string;
  error?: string;
  /** Same-site URLs that answered with a redirect — followed, not audited. */
  redirectingUrls?: number;
  /** Set when this report was served from storage rather than a live crawl. */
  fromCache?: boolean;
  /** ISO timestamp of when the crawl actually ran. */
  generatedAt?: string;
  durationMs: number;
  pagesDiscovered: number;
  pagesCrawled: number;
  truncated: boolean;
  score: number;
  categoryScores: { label: string; score: number }[];
  summary: string;
  actions: SiteAction[];
  stats: {
    missingTitle: number;
    missingMeta: number;
    missingH1: number;
    thinPages: number;
    imagesTotal: number;
    imagesMissingAlt: number;
    noindexPages: number;
    missingCanonical: number;
    missingOg: number;
    missingStructuredData: number;
    missingLang: number;
    fetchErrors: number;
  };
  technical: {
    sitemapFound: boolean;
    robotsFound: boolean;
    httpRedirectsToHttps: boolean | null;
    wwwVariantRedirects: boolean | null;
  };
  duplicateTitles: SiteIssueGroup[];
  duplicateMetas: SiteIssueGroup[];
  brokenLinks: BrokenLink[];
  /** Worst pages first. */
  pages: SitePageResult[];
}

/* ── Small utilities ──────────────────────────────────────────────── */

async function fetchWithTimeout(
  url: string,
  ms: number,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      redirect: "follow",
      ...init,
      signal: controller.signal,
      headers: { "User-Agent": UA, ...(init?.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Run tasks with a fixed-size worker pool. */
async function pool<T>(
  items: T[],
  size: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const runners = Array.from(
    { length: Math.min(size, items.length) },
    async () => {
      while (i < items.length) {
        const item = items[i++]!;
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
}

/** Hosts count as the same site across the www prefix. */
function siteKey(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

function normalizeUrl(raw: string, base: string): string | null {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  url.hash = "";
  // Tracking params churn URLs without changing content.
  for (const p of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid)/i.test(p)) url.searchParams.delete(p);
  }
  if (SKIP_EXTENSIONS.test(url.pathname)) return null;
  return url.href;
}

function extractLinks(html: string, pageUrl: string): string[] {
  const links: string[] = [];
  for (const match of html.matchAll(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi,
  )) {
    const normalized = normalizeUrl(match[1] ?? "", pageUrl);
    if (normalized) links.push(normalized);
    if (links.length >= 300) break;
  }
  return links;
}

/* ── Discovery: robots.txt + sitemaps ─────────────────────────────── */

interface Discovery {
  seeds: string[];
  disallow: string[];
  sitemapFound: boolean;
  robotsFound: boolean;
}

async function discover(
  origin: string,
  maxSeeds: number,
): Promise<Discovery> {
  const seeds: string[] = [];
  const disallow: string[] = [];
  let sitemapFound = false;
  let robotsFound = false;
  const sitemapUrls = [`${origin}/sitemap.xml`];

  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, 5_000);
    if (res.ok) {
      robotsFound = true;
      const text = (await res.text()).slice(0, 100_000);
      let appliesToUs = false;
      for (const line of text.split("\n")) {
        const [rawKey, ...rest] = line.split(":");
        const key = rawKey?.trim().toLowerCase();
        const value = rest.join(":").trim();
        if (key === "user-agent") appliesToUs = value === "*";
        else if (key === "disallow" && appliesToUs && value)
          disallow.push(value);
        else if (key === "sitemap" && value) sitemapUrls.unshift(value);
      }
    }
  } catch {
    // No robots.txt is fine.
  }

  const seen = new Set<string>();
  const queue = [...new Set(sitemapUrls)].slice(0, 3);
  while (queue.length > 0 && seeds.length < maxSeeds) {
    const sitemapUrl = queue.shift()!;
    if (seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);
    try {
      const res = await fetchWithTimeout(sitemapUrl, 8_000);
      if (!res.ok) continue;
      const xml = (await res.text()).slice(0, 2_000_000);
      sitemapFound = true;
      const isIndex = /<sitemapindex/i.test(xml);
      for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
        const loc = match[1]!;
        if (isIndex) {
          if (seen.size < 8) queue.push(loc);
        } else {
          const normalized = normalizeUrl(loc, origin);
          if (normalized) seeds.push(normalized);
        }
      }
    } catch {
      // Unreachable sitemap — BFS will carry discovery.
    }
  }

  return { seeds, disallow, sitemapFound, robotsFound };
}

/* ── Redirect sanity ──────────────────────────────────────────────── */

async function checkRedirect(from: string, toHost: string): Promise<boolean | null> {
  try {
    const res = await fetchWithTimeout(from, 6_000, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") ?? "";
      try {
        return siteKey(new URL(location, from).hostname) === siteKey(toHost);
      } catch {
        return false;
      }
    }
    // 200 on the variant means both hosts serve content — duplicate site.
    return res.ok ? false : null;
  } catch {
    return null; // variant doesn't resolve at all — nothing to fix
  }
}

/* ── AI synthesis ─────────────────────────────────────────────────── */

const PLAN_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "A 3-5 sentence executive summary of the site's SEO health, written in plain everyday language for a non-technical reader. Concrete numbers, no fluff, no unexplained jargon.",
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              "Short imperative headline in plain language (jargon-free where possible).",
          },
          detail: {
            type: "string",
            description:
              "2-3 sentences: what to do and why it matters, referencing this site's actual findings. Define any technical term in a few words the first time it appears — the reader works in operations, not SEO.",
          },
          impact: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["title", "detail", "impact"],
      },
      description: "5-10 prioritized actions, highest impact first.",
    },
  },
  required: ["summary", "actions"],
};

async function synthesize(
  report: Omit<SiteAuditReport, "summary" | "actions">,
): Promise<{ summary: string; actions: SiteAction[] }> {
  const anthropic = new Anthropic();
  const worst = report.pages
    .slice(0, 12)
    .map(
      (p) =>
        `- ${p.url} (${p.failCount} fails, ${p.warnCount} warns): ${p.findings
          .slice(0, 4)
          .map((f) => f.label)
          .join(", ")}`,
    )
    .join("\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system:
      "You are a senior SEO consultant delivering a site-wide audit to a non-technical operations team. Turn the crawl findings into an executive summary and a prioritized action plan. Write in plain everyday language: assume the reader has never heard SEO jargon, so the first time you use any technical term — meta description, H1, canonical, Open Graph, structured data, sitemap, alt text, noindex — define it in a few words right in the sentence, e.g. \"meta descriptions (the short blurb Google shows under your link in search results)\". No unexplained acronyms, ever. Reference the site's real numbers. Never invent facts about the business, and never recommend anything the data doesn't support.",
    messages: [
      {
        role: "user",
        content: `Site: ${report.root}
Pages crawled: ${report.pagesCrawled} of ${report.pagesDiscovered} discovered${report.truncated ? " (crawl truncated by budget)" : ""}
Overall score: ${report.score}/100

Site-wide stats:
- Pages missing title: ${report.stats.missingTitle}
- Pages missing meta description: ${report.stats.missingMeta}
- Pages missing H1: ${report.stats.missingH1}
- Thin pages (<150 words): ${report.stats.thinPages}
- Images missing alt text: ${report.stats.imagesMissingAlt} of ${report.stats.imagesTotal}
- Pages missing canonical: ${report.stats.missingCanonical}
- Pages missing Open Graph tags: ${report.stats.missingOg}
- Pages without structured data (JSON-LD): ${report.stats.missingStructuredData}
- Pages marked noindex: ${report.stats.noindexPages}
- Fetch errors during crawl: ${report.stats.fetchErrors}
- Duplicate titles: ${report.duplicateTitles.length} groups
- Duplicate meta descriptions: ${report.duplicateMetas.length} groups
- Broken internal links: ${report.brokenLinks.length}

Technical:
- sitemap.xml: ${report.technical.sitemapFound ? "found" : "MISSING"}
- robots.txt: ${report.technical.robotsFound ? "found" : "missing"}
- http→https redirect: ${fmtBool(report.technical.httpRedirectsToHttps)}
- www/apex variant redirect: ${fmtBool(report.technical.wwwVariantRedirects)}

Worst pages:
${worst || "(none — clean crawl)"}`,
      },
    ],
    tools: [
      {
        name: "save_plan",
        description: "Save the summary and action plan.",
        input_schema: PLAN_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_plan" },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  const input = toolUse?.input as
    | { summary?: string; actions?: SiteAction[] }
    | undefined;
  return {
    summary: input?.summary ?? "",
    actions: (input?.actions ?? []).slice(0, 10),
  };
}

function fmtBool(v: boolean | null): string {
  return v === null ? "n/a" : v ? "OK" : "PROBLEM";
}

/* ── The crawl ────────────────────────────────────────────────────── */

export async function runDeepSiteAudit(
  rawUrl: string,
  options: DeepAuditOptions = {},
): Promise<SiteAuditReport> {
  const started = Date.now();
  const timeBudgetMs = options.timeBudgetMs ?? TIME_BUDGET_MS;
  const maxPages = options.maxPages ?? MAX_PAGES;
  const deadline = started + timeBudgetMs;
  const rootUrl = validateAuditUrl(rawUrl);
  const origin = rootUrl.origin;
  const site = siteKey(rootUrl.hostname);

  const empty = (error: string): SiteAuditReport => ({
    root: origin,
    error,
    durationMs: Date.now() - started,
    pagesDiscovered: 0,
    pagesCrawled: 0,
    truncated: false,
    score: 0,
    categoryScores: [],
    summary: "",
    actions: [],
    stats: {
      missingTitle: 0, missingMeta: 0, missingH1: 0, thinPages: 0,
      imagesTotal: 0, imagesMissingAlt: 0, noindexPages: 0,
      missingCanonical: 0, missingOg: 0, missingStructuredData: 0,
      missingLang: 0, fetchErrors: 0,
    },
    technical: {
      sitemapFound: false, robotsFound: false,
      httpRedirectsToHttps: null, wwwVariantRedirects: null,
    },
    duplicateTitles: [],
    duplicateMetas: [],
    brokenLinks: [],
    pages: [],
  });

  const discovery = await discover(origin, maxPages * 2);
  const isDisallowed = (url: string): boolean => {
    const path = new URL(url).pathname;
    return discovery.disallow.some((rule) => path.startsWith(rule));
  };

  const queue: string[] = [];
  const queued = new Set<string>();
  const enqueue = (url: string) => {
    if (queued.has(url) || queued.size >= maxPages) return;
    if (siteKey(new URL(url).hostname) !== site) return;
    if (isDisallowed(url)) return;
    queued.add(url);
    queue.push(url);
  };
  enqueue(rootUrl.href);
  for (const seed of discovery.seeds) enqueue(seed);

  const pages: SitePageResult[] = [];
  const crawledOk = new Set<string>();
  const linkReferrers = new Map<string, string>(); // internal href → first page it was found on
  let fetchErrors = 0;
  let redirectingUrls = 0;
  let variantUrls = 0;
  let truncated = false;

  const stats = {
    missingTitle: 0, missingMeta: 0, missingH1: 0, thinPages: 0,
    imagesTotal: 0, imagesMissingAlt: 0, noindexPages: 0,
    missingCanonical: 0, missingOg: 0, missingStructuredData: 0,
    missingLang: 0, fetchErrors: 0,
  };
  const titleGroups = new Map<string, string[]>();
  const metaGroups = new Map<string, string[]>();
  // URL -> its canonical target (absolute), for canonical-aware dup grouping.
  const canonicalOf = new Map<string, string>();

  async function crawlPage(pageUrl: string): Promise<void> {
    if (Date.now() > deadline) {
      truncated = true;
      return;
    }
    let html: string;
    let status = 0;
    try {
      // Redirects are plumbing, not pages: audit the destination under its
      // own URL instead of blaming the source for the destination's content
      // (which faked missing-title and duplicate-title findings).
      // One retry with a longer timeout: a cold ISR/serverless render can
      // exceed the first window, and a transient miss showing up as a
      // "fetch error" finding is noise the site owner can't act on.
      let res: Response;
      try {
        res = await fetchWithTimeout(pageUrl, PAGE_TIMEOUT_MS, {
          redirect: "manual",
        });
      } catch {
        res = await fetchWithTimeout(pageUrl, PAGE_TIMEOUT_MS * 2, {
          redirect: "manual",
        });
      }
      status = res.status;
      if (status >= 300 && status < 400) {
        redirectingUrls++;
        const location = res.headers.get("location");
        const target = location ? normalizeUrl(location, pageUrl) : null;
        if (
          target &&
          siteKey(new URL(target).hostname) === site &&
          Date.now() < deadline
        ) {
          enqueue(target);
        }
        return;
      }
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.includes("html")) {
        if (!res.ok) fetchErrors++;
        pages.push({
          url: pageUrl, status, ok: false, title: "", wordCount: 0,
          noindex: false, hasStructuredData: false,
          failCount: res.ok ? 0 : 1, warnCount: 0,
          findings: res.ok
            ? []
            : [{ id: "fetch", label: "Page fetch", status: "fail", detail: `HTTP ${status}.` }],
        });
        return;
      }
      html = (await res.text()).slice(0, MAX_HTML_BYTES);
    } catch {
      fetchErrors++;
      pages.push({
        url: pageUrl, status: 0, ok: false, title: "", wordCount: 0,
        noindex: false, hasStructuredData: false, failCount: 1, warnCount: 0,
        findings: [{ id: "fetch", label: "Page fetch", status: "fail", detail: "Timed out or unreachable." }],
      });
      return;
    }

    crawledOk.add(pageUrl);
    const signals = analyze(new URL(pageUrl), html);
    let queryVariant = false;
    if (signals.canonical) {
      try {
        const canon = new URL(signals.canonical, pageUrl);
        canonicalOf.set(pageUrl, canon.href);
        // A ?query view whose canonical is its own path (?category=,
        // ?page=2, ?id=) is not independently indexable — search engines
        // consolidate it into the canonical page. Scoring its warns as a
        // separate page is a false positive. Deliberately narrow: only
        // same-origin, same-path, query-only differences qualify, so a
        // site that mistakenly canonicals everything to "/" is unaffected.
        const self = new URL(pageUrl);
        queryVariant =
          canon.href !== self.href &&
          canon.origin === self.origin &&
          canon.pathname.replace(/\/$/, "") ===
            self.pathname.replace(/\/$/, "") &&
          self.search !== "";
      } catch {
        // Malformed canonical — fall back to the page URL itself.
      }
    }
    if (queryVariant) {
      variantUrls++;
      // Still feed the BFS — variants often link content pages (pagination).
      for (const link of extractLinks(html, pageUrl)) {
        if (siteKey(new URL(link).hostname) !== site) continue;
        if (!linkReferrers.has(link)) linkReferrers.set(link, pageUrl);
        if (Date.now() < deadline) enqueue(link);
        else truncated = true;
      }
      return;
    }
    const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
    if (noindex) {
      // Search engines won't index this page, so its on-page findings can't
      // affect rankings — count it, follow its links, but don't score it.
      stats.noindexPages++;
      for (const link of extractLinks(html, pageUrl)) {
        if (siteKey(new URL(link).hostname) !== site) continue;
        if (!linkReferrers.has(link)) linkReferrers.set(link, pageUrl);
        if (Date.now() < deadline) enqueue(link);
        else truncated = true;
      }
      return;
    }
    const checks = buildChecks(signals);
    const hasStructuredData = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
    const hasLang = /<html[^>]+\blang\s*=/i.test(html);

    if (!signals.title) stats.missingTitle++;
    else {
      const key = signals.title.toLowerCase();
      titleGroups.set(key, [...(titleGroups.get(key) ?? []), pageUrl]);
    }
    if (!signals.metaDescription) stats.missingMeta++;
    else {
      const key = signals.metaDescription.toLowerCase();
      metaGroups.set(key, [...(metaGroups.get(key) ?? []), pageUrl]);
    }
    if (signals.h1s.length === 0) stats.missingH1++;
    if (signals.wordCount < 150) stats.thinPages++;
    stats.imagesTotal += signals.imgCount;
    stats.imagesMissingAlt += signals.imgMissingAlt;
    if (!signals.canonical) stats.missingCanonical++;
    if (!signals.hasOgTitle || !signals.hasOgImage) stats.missingOg++;
    if (!hasStructuredData) stats.missingStructuredData++;
    if (!hasLang) stats.missingLang++;

    const findings = checks.filter((c) => c.status !== "pass");
    pages.push({
      url: pageUrl,
      status,
      ok: true,
      title: signals.title,
      wordCount: signals.wordCount,
      noindex,
      hasStructuredData,
      failCount: findings.filter((f) => f.status === "fail").length,
      warnCount: findings.filter((f) => f.status === "warn").length,
      findings,
    });

    for (const link of extractLinks(html, pageUrl)) {
      if (siteKey(new URL(link).hostname) !== site) continue;
      if (!linkReferrers.has(link)) linkReferrers.set(link, pageUrl);
      if (Date.now() < deadline) enqueue(link);
      else truncated = true;
    }
  }

  // BFS in waves: the queue grows while a wave is crawling, so loop until
  // it drains, the page cap is hit, or the clock runs out.
  let cursor = 0;
  while (cursor < queue.length) {
    if (Date.now() > deadline) {
      truncated = true;
      break;
    }
    const wave = queue.slice(cursor, queue.length);
    cursor = queue.length;
    await pool(wave, CONCURRENCY, crawlPage);
  }
  if (queued.size >= maxPages) truncated = true;
  if (pages.length === 0) return empty("The site could not be crawled — is it up?");
  stats.fetchErrors = fetchErrors;

  // Broken internal links: hrefs seen during the crawl that we did not
  // successfully crawl ourselves get a spot check.
  const candidates = [...linkReferrers.keys()]
    .filter((link) => !crawledOk.has(link) && !isDisallowed(link))
    .slice(0, MAX_LINK_CHECKS);
  const brokenLinks: BrokenLink[] = [];
  if (Date.now() < deadline) {
    await pool(candidates, CONCURRENCY + 2, async (link) => {
      if (Date.now() > deadline) return;
      try {
        let res = await fetchWithTimeout(link, LINK_TIMEOUT_MS, { method: "HEAD" });
        if (res.status >= 400) {
          // Some servers 404/405 HEAD but serve GET fine (GrowthZone's
          // members portal, for one) — always confirm a failure with GET
          // before calling the link broken.
          res = await fetchWithTimeout(link, LINK_TIMEOUT_MS);
        }
        if (res.status >= 400) {
          brokenLinks.push({ url: link, status: res.status, foundOn: linkReferrers.get(link)! });
        }
      } catch {
        // Unreachable ≠ provably broken — leave it out rather than cry wolf.
      }
    });
  }
  brokenLinks.sort((a, b) => a.url.localeCompare(b.url));

  // Redirect sanity: http→https, and the www/apex sibling → canonical host.
  const host = rootUrl.hostname;
  const sibling = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const [httpRedirectsToHttps, wwwVariantRedirects] = await Promise.all([
    rootUrl.protocol === "https:" ? checkRedirect(`http://${host}/`, host) : Promise.resolve(false),
    checkRedirect(`https://${sibling}/`, host),
  ]);

  // Canonical-aware duplicate grouping: query/pagination variants of one
  // page (?category=, ?page=2) all declare the same canonical, and search
  // engines consolidate them — flagging those as duplicates is a false
  // positive. A group only counts when it spans >1 distinct canonical target.
  const canonKey = (u: string): string => canonicalOf.get(u) ?? u;
  const dupGroups = (groups: Map<string, string[]>): SiteIssueGroup[] =>
    [...groups.entries()]
      .map(([value, urls]) => {
        const seen = new Set<string>();
        const distinct = urls.filter((u) => {
          const k = canonKey(u);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        return { value, urls: distinct };
      })
      .filter((g) => g.urls.length > 1)
      .sort((a, b) => b.urls.length - a.urls.length)
      .slice(0, 20);
  const duplicateTitles: SiteIssueGroup[] = dupGroups(titleGroups);
  const duplicateMetas: SiteIssueGroup[] = dupGroups(metaGroups);

  // Scores. Page score: 100 − 15/fail − 5/warn. Categories group check ids.
  const pageScore = (p: SitePageResult) =>
    Math.max(0, 100 - p.failCount * 15 - p.warnCount * 5);
  const mean = pages.length
    ? pages.reduce((sum, p) => sum + pageScore(p), 0) / pages.length
    : 0;
  let score = mean;
  score -= Math.min(10, brokenLinks.length);
  if (duplicateTitles.length > 0) score -= 5;
  if (!discovery.sitemapFound) score -= 5;
  if (httpRedirectsToHttps === false) score -= 5;
  if (wwwVariantRedirects === false) score -= 3;
  score = Math.round(Math.max(0, Math.min(100, score)));

  const categoryScore = (ids: string[]): number => {
    let total = 0;
    let bad = 0;
    for (const p of pages.filter((page) => page.ok)) {
      total += ids.length;
      bad += p.findings.filter((f) => ids.includes(f.id)).reduce(
        (n, f) => n + (f.status === "fail" ? 1 : 0.5),
        0,
      );
    }
    return total === 0 ? 100 : Math.round(Math.max(0, 100 - (bad / total) * 100));
  };
  const categoryScores = [
    { label: "Content", score: categoryScore(["title", "meta", "h1", "content"]) },
    { label: "Technical", score: categoryScore(["https", "viewport", "canonical"]) },
    { label: "Social", score: categoryScore(["og"]) },
    { label: "Accessibility", score: categoryScore(["alt"]) },
  ];

  pages.sort(
    (a, b) => b.failCount * 15 + b.warnCount * 5 - (a.failCount * 15 + a.warnCount * 5),
  );
  // Scores and stats above cover every crawled page; the report itself only
  // carries the pages with findings — on an uncapped multi-thousand-page
  // crawl, clean pages would bloat the jsonb row and the action response.
  const reportPages = pages
    .filter((p) => p.failCount + p.warnCount > 0)
    .slice(0, MAX_REPORT_PAGES);

  const base: Omit<SiteAuditReport, "summary" | "actions"> = {
    root: origin,
    redirectingUrls,
    durationMs: Date.now() - started,
    pagesDiscovered: queued.size + Math.max(0, discovery.seeds.length - queued.size),
    pagesCrawled: pages.length,
    truncated,
    score,
    categoryScores,
    stats,
    technical: {
      sitemapFound: discovery.sitemapFound,
      robotsFound: discovery.robotsFound,
      httpRedirectsToHttps,
      wwwVariantRedirects,
    },
    duplicateTitles,
    duplicateMetas,
    brokenLinks,
    pages: reportPages,
  };

  let summary = "";
  let actions: SiteAction[] = [];
  try {
    ({ summary, actions } = await synthesize(base));
  } catch {
    // The deterministic report stands on its own if the AI pass fails.
  }

  return {
    ...base,
    summary,
    actions,
    durationMs: Date.now() - started,
    generatedAt: new Date().toISOString(),
  };
}
