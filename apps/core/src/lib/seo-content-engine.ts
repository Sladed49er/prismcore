import Anthropic from "@anthropic-ai/sdk";
import { listWebsitePages } from "@/lib/website";
import {
  createSeoDraft,
  getSeoSettings,
  type SeoKeyword,
} from "@/lib/seo";

/**
 * The SEO content engine.
 *
 * Given a tracked keyword, drafts a full article for the agency's website:
 * grounded in the tenant's brand brief and page inventory, optimized for the
 * keyword's search intent. The result is only ever saved as a *draft* — a
 * human approves it in the SEO Engine module before anything publishes.
 */

const MODEL = "claude-sonnet-4-6";

interface GeneratedArticle {
  title: string;
  slug: string;
  metaDescription: string;
  body: string;
}

const ARTICLE_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Article headline. Compelling, specific, under 65 characters.",
    },
    slug: {
      type: "string",
      description:
        "URL slug: lowercase words joined by hyphens, derived from the title.",
    },
    metaDescription: {
      type: "string",
      description: "SEO meta description, 140-160 characters.",
    },
    body: {
      type: "string",
      description:
        "The full article in Markdown. Do NOT repeat the title or use an H1 — the site renders the title itself; start with a paragraph and use H2/H3 section headings. 900-1400 words.",
    },
  },
  required: ["title", "slug", "metaDescription", "body"],
};

function systemPrompt(input: {
  siteUrl: string;
  brandBrief: string;
  pageList: string;
}): string {
  return `You are the content writer for an independent insurance organization's website (${input.siteUrl || "not yet configured"}).

About the organization:
${input.brandBrief || "(No brand brief configured — write in a professional, member-focused voice for an insurance trade organization.)"}

Existing site pages (link to relevant ones naturally, never invent URLs):
${input.pageList || "(none listed)"}

Writing rules:
- Write for the reader first, search engines second. No keyword stuffing.
- Ground every claim in general industry knowledge; never fabricate statistics, quotes, laws, or dates.
- Use the keyword and close variants naturally in the title, first paragraph, and one H2.
- Short paragraphs, concrete examples, active voice.
- End with a short call to action relevant to the organization.`;
}

/**
 * Draft one article for a keyword and save it as a `draft` for human review.
 * Returns the generated title, or throws with a readable message.
 */
export async function generateArticleDraft(input: {
  tenantId: string;
  keyword: SeoKeyword;
}): Promise<string> {
  const { tenantId, keyword } = input;
  const [settings, pages] = await Promise.all([
    getSeoSettings(tenantId),
    listWebsitePages(tenantId),
  ]);

  const pageList = pages
    .filter((p) => p.status === "published")
    .map((p) => `- ${p.title} (${p.url || p.slug})`)
    .join("\n");

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt({
      siteUrl: settings?.siteUrl ?? "",
      brandBrief: settings?.brandBrief ?? "",
      pageList,
    }),
    messages: [
      {
        role: "user",
        content: `Write an article targeting the keyword "${keyword.phrase}" (search intent: ${keyword.intent}${keyword.cluster ? `, topic cluster: ${keyword.cluster}` : ""}).${keyword.notes ? `\n\nEditor notes: ${keyword.notes}` : ""}`,
      },
    ],
    tools: [
      {
        name: "save_article",
        description: "Save the finished article.",
        input_schema: ARTICLE_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_article" },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("The model returned no article.");
  }
  const article = toolUse.input as GeneratedArticle;
  if (!article.title?.trim() || !article.body?.trim()) {
    throw new Error("The model returned an incomplete article.");
  }

  await createSeoDraft({
    tenantId,
    title: article.title.trim(),
    slug: article.slug?.trim() || slugify(article.title),
    metaDescription: article.metaDescription?.trim() ?? "",
    body: article.body.trim(),
    keywordId: keyword.id,
    model: MODEL,
  });

  return article.title.trim();
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
