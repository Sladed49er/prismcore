import { marked } from "marked";
import {
  getSeoDraft,
  getSeoSettings,
  markSeoDraftPublished,
} from "@/lib/seo";
import type { SeoSettings } from "@/lib/seo";

/**
 * The SEO publisher.
 *
 * Publishes an *approved* draft by committing it to the tenant's website
 * repository. Static sites (the PIA West pattern) rebuild automatically on
 * push, so a commit IS a publish. Two formats, chosen per tenant in settings:
 *
 * - "markdown_file": one `<contentDir>/<slug>.md` with frontmatter, via the
 *   GitHub Contents API.
 * - "posts_json": the piawest pattern — `<contentDir>/<slug>.json` holding
 *   HTML content, plus an entry prepended to the sibling `posts-index.json`
 *   (the site only surfaces posts listed there). Both files land in a single
 *   commit via the Git Data API so the site never deploys a half-published
 *   post. The entry's date is a Pacific wall-clock stamp — that is the
 *   site's scheduled-publish gate, so "now" means live on the next rebuild.
 *
 * Auth: `SEO_PUBLISHER_GITHUB_TOKEN` — a fine-grained token with contents:write
 * on the site repositories this Prism instance publishes to.
 */

const GITHUB_API = "https://api.github.com";

export interface PublishResult {
  path: string;
  url: string;
  commitSha: string;
}

export async function publishDraft(input: {
  tenantId: string;
  draftId: string;
}): Promise<PublishResult> {
  const { tenantId, draftId } = input;
  const [draft, settings] = await Promise.all([
    getSeoDraft(tenantId, draftId),
    getSeoSettings(tenantId),
  ]);

  if (!draft) throw new Error("Draft not found.");
  if (draft.status !== "approved") {
    throw new Error("Only approved drafts can be published.");
  }
  if (!settings || settings.publishMode !== "github_commit") {
    throw new Error(
      "Publishing is not configured — set the publish mode to GitHub in SEO settings.",
    );
  }
  if (!settings.repoOwner || !settings.repoName || !settings.contentDir) {
    throw new Error(
      "Publishing is not configured — set the repository and content directory in SEO settings.",
    );
  }
  const token = process.env.SEO_PUBLISHER_GITHUB_TOKEN;
  if (!token) {
    throw new Error("SEO_PUBLISHER_GITHUB_TOKEN is not set.");
  }

  const slug = draft.slug || "untitled";
  const gh = githubClient(token, settings);

  const { path, commitSha } =
    settings.publishFormat === "posts_json"
      ? await publishPostsJson({ gh, settings, slug, draft })
      : await publishMarkdownFile({ gh, settings, slug, draft });

  const base = settings.siteUrl.replace(/\/$/, "");
  const prefix = settings.urlPrefix
    ? `/${settings.urlPrefix.replace(/^\/|\/$/g, "")}`
    : "";
  const url = base ? `${base}${prefix}/${slug}` : "";

  await markSeoDraftPublished({
    tenantId,
    id: draftId,
    publishedPath: path,
    publishedUrl: url,
    commitSha,
  });

  return { path, url, commitSha };
}

interface DraftContent {
  title: string;
  metaDescription: string;
  body: string;
}

interface FormatInput {
  gh: GithubClient;
  settings: SeoSettings;
  slug: string;
  draft: DraftContent;
}

/* ── Format: one Markdown file with frontmatter ───────────────────── */

async function publishMarkdownFile({
  gh,
  settings,
  slug,
  draft,
}: FormatInput): Promise<{ path: string; commitSha: string }> {
  const path = `${settings.contentDir.replace(/\/$/, "")}/${slug}.md`;
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(draft.title)}`,
    `description: ${JSON.stringify(draft.metaDescription)}`,
    `date: ${JSON.stringify(new Date().toISOString().slice(0, 10))}`,
    "---",
    "",
  ].join("\n");
  const commitSha = await gh.putFile({
    path,
    content: frontmatter + draft.body + "\n",
    message: `content: ${draft.title}`,
  });
  return { path, commitSha };
}

/* ── Format: post JSON + posts-index.json (piawest) ───────────────── */

async function publishPostsJson({
  gh,
  settings,
  slug,
  draft,
}: FormatInput): Promise<{ path: string; commitSha: string }> {
  const contentDir = settings.contentDir.replace(/\/$/, "");
  const postPath = `${contentDir}/${slug}.json`;
  // The index lives beside the posts directory: data/posts → data/posts-index.json.
  const indexPath = `${contentDir.replace(/\/[^/]*$/, "")}/posts-index.json`;

  const categorySlug = settings.urlPrefix.replace(/^\/|\/$/g, "");
  const date = pacificStamp();
  const html = await marked.parse(draft.body, { async: true });

  const post = {
    slug,
    title: draft.title,
    date,
    content: html.trim(),
    categories: categorySlug
      ? [{ slug: categorySlug, name: titleFromSlug(categorySlug) }]
      : [],
    tags: [],
  };

  const rawIndex = await gh.readFile(indexPath);
  if (rawIndex === undefined) {
    throw new Error(
      `${indexPath} was not found in ${settings.repoOwner}/${settings.repoName}@${settings.repoBranch} — check the content directory setting.`,
    );
  }
  let index: Array<{ slug: string }>;
  try {
    index = JSON.parse(rawIndex);
    if (!Array.isArray(index)) throw new Error("not an array");
  } catch {
    throw new Error(`${indexPath} is not a JSON array — refusing to publish.`);
  }
  const entry = {
    slug,
    title: draft.title,
    date,
    categories: categorySlug ? [categorySlug] : [],
  };
  const nextIndex = [entry, ...index.filter((e) => e.slug !== slug)];

  const commitSha = await gh.commitFiles({
    message: `content: ${draft.title}`,
    files: [
      { path: postPath, content: JSON.stringify(post) + "\n" },
      { path: indexPath, content: JSON.stringify(nextIndex, null, 2) + "\n" },
    ],
  });
  return { path: postPath, commitSha };
}

/** Current Pacific wall-clock as "YYYY-MM-DD HH:MM:SS" — the piawest
 *  posts-index date format and scheduled-publish gate. */
function pacificStamp(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = g("hour") === "24" ? "00" : g("hour");
  return `${g("year")}-${g("month")}-${g("day")} ${hour}:${g("minute")}:${g("second")}`;
}

/** "news-releases-and-bulletins" → "News Releases and Bulletins". */
function titleFromSlug(slug: string): string {
  const minor = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "or", "the", "to"]);
  return slug
    .split("-")
    .map((word, i) =>
      i > 0 && minor.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/* ── GitHub client ────────────────────────────────────────────────── */

type GithubClient = ReturnType<typeof githubClient>;

function githubClient(
  token: string,
  settings: Pick<SeoSettings, "repoOwner" | "repoName" | "repoBranch">,
) {
  const repo = `${GITHUB_API}/repos/${settings.repoOwner}/${settings.repoName}`;
  const branch = settings.repoBranch;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  async function api<T>(
    url: string,
    init?: { method?: string; body?: unknown; accept?: string },
  ): Promise<T> {
    const response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.accept ? { ...headers, Accept: init.accept } : headers,
      ...(init?.body !== undefined
        ? { body: JSON.stringify(init.body) }
        : {}),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `GitHub rejected the publish (${response.status}): ${detail.slice(0, 300)}`,
      );
    }
    return (init?.accept === "application/vnd.github.raw+json"
      ? response.text()
      : response.json()) as Promise<T>;
  }

  return {
    /** Raw file content at the publish branch, or undefined if absent. */
    async readFile(path: string): Promise<string | undefined> {
      const response = await fetch(
        `${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
        { headers: { ...headers, Accept: "application/vnd.github.raw+json" } },
      );
      if (response.status === 404) return undefined;
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `GitHub rejected the publish (${response.status}): ${detail.slice(0, 300)}`,
        );
      }
      return response.text();
    },

    /** Create or update a single file via the Contents API. */
    async putFile(input: {
      path: string;
      content: string;
      message: string;
    }): Promise<string> {
      const endpoint = `${repo}/contents/${input.path}`;
      // If the file already exists, the Contents API requires its blob sha.
      let existingSha: string | undefined;
      const probe = await fetch(
        `${endpoint}?ref=${encodeURIComponent(branch)}`,
        { headers },
      );
      if (probe.ok) {
        const body = (await probe.json()) as { sha?: string };
        existingSha = body.sha;
      }
      const result = await api<{ commit?: { sha?: string } }>(endpoint, {
        method: "PUT",
        body: {
          message: input.message,
          content: Buffer.from(input.content, "utf8").toString("base64"),
          branch,
          ...(existingSha ? { sha: existingSha } : {}),
        },
      });
      return result.commit?.sha ?? "";
    },

    /** Commit several files atomically via the Git Data API. */
    async commitFiles(input: {
      message: string;
      files: Array<{ path: string; content: string }>;
    }): Promise<string> {
      const ref = await api<{ object: { sha: string } }>(
        `${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
      );
      const parentSha = ref.object.sha;
      const parent = await api<{ tree: { sha: string } }>(
        `${repo}/git/commits/${parentSha}`,
      );
      const tree = await api<{ sha: string }>(`${repo}/git/trees`, {
        method: "POST",
        body: {
          base_tree: parent.tree.sha,
          tree: input.files.map((f) => ({
            path: f.path,
            mode: "100644",
            type: "blob",
            content: f.content,
          })),
        },
      });
      const commit = await api<{ sha: string }>(`${repo}/git/commits`, {
        method: "POST",
        body: {
          message: input.message,
          tree: tree.sha,
          parents: [parentSha],
        },
      });
      await api(`${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: "PATCH",
        body: { sha: commit.sha },
      });
      return commit.sha;
    },
  };
}
