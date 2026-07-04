import Anthropic from "@anthropic-ai/sdk";
import { validateAuditUrl } from "@/lib/seo-audit";

/**
 * AI filler copy for thin-content findings.
 *
 * Given a page the audit flagged as thin (under ~150 words), draft ADDITIVE
 * copy the site owner can paste below their existing text to reach a healthy
 * content depth. Hard rules, enforced by the prompt: the draft is grounded
 * strictly in what the page already says — no invented facts, numbers,
 * names, prices, or claims — and the existing copy is never rewritten. The
 * point is consistency: same voice, more depth, zero new assertions.
 */

const MODEL = "claude-sonnet-4-6";
const TARGET_WORDS = 200; // comfortable margin over the 150-word threshold
const MAX_SOURCE_WORDS = 400; // beyond this the page isn't thin — refuse

export interface ContentFillResult {
  ok: boolean;
  error?: string;
  /** Plain-text paragraphs, ready to paste below the existing copy. */
  draft?: string;
  /** Words currently on the page (as we extracted them). */
  pageWords?: number;
}

function stripToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(header|nav|footer)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function draftContentFill(
  rawUrl: string,
): Promise<ContentFillResult> {
  let url: URL;
  try {
    url = validateAuditUrl(rawUrl);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid URL.",
    };
  }

  let html: string;
  try {
    const res = await fetch(url.href, {
      headers: { "User-Agent": "PrismOptimize-ContentFill/1.0 (+https://prismoptimize.com)" },
    });
    if (!res.ok) return { ok: false, error: `The page returned ${res.status}.` };
    html = (await res.text()).slice(0, 500_000);
  } catch {
    return { ok: false, error: "Couldn't fetch the page." };
  }

  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const text = stripToText(html);
  const pageWords = text ? text.split(" ").length : 0;
  if (pageWords > MAX_SOURCE_WORDS) {
    return {
      ok: false,
      pageWords,
      error: `This page already has ~${pageWords} words — it isn't thin.`,
    };
  }
  if (pageWords < 5) {
    return {
      ok: false,
      pageWords,
      error:
        "The page has almost no text to ground a draft in — it needs real content (or a redirect), not filler.",
    };
  }

  const needed = Math.max(60, TARGET_WORDS - pageWords);
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [
      {
        role: "user",
        content: `You are drafting SUPPLEMENTAL website copy for a page that search engines flag as thin content. The copy will be pasted BELOW the page's existing text, which will not change.

Page title: ${title || "(none)"}
Existing page text:
"""
${text}
"""

Write roughly ${needed} words of additional copy. Hard rules:
- Ground every sentence in the existing text above. Do NOT introduce facts, statistics, prices, dates, names, programs, or claims that are not already stated or directly implied.
- You may elaborate, contextualize, and restate what's there in more helpful detail (what it is, who it's for, what to do next) — you may not assert anything new.
- Match the existing tone and reading level exactly. If the page is plain and practical, stay plain and practical.
- No headings, no bullet lists, no calls to contact unless the page already gives contact instructions.
- Output ONLY the copy itself as one or two plain paragraphs — no preamble, no quotes, no commentary.`,
      },
    ],
  });

  const draft = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  if (!draft) return { ok: false, pageWords, error: "The draft came back empty — try again." };
  return { ok: true, draft, pageWords };
}
