import {
  getSeoDraft,
  getSeoSettings,
  markSeoDraftPublished,
} from "@/lib/seo";

/**
 * The SEO publisher.
 *
 * Publishes an *approved* draft by committing a Markdown file to the tenant's
 * website repository via the GitHub Contents API. Static sites (the PIA West
 * pattern) rebuild automatically on push, so a commit IS a publish.
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
  const path = `${settings.contentDir.replace(/\/$/, "")}/${slug}.md`;
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(draft.title)}`,
    `description: ${JSON.stringify(draft.metaDescription)}`,
    `date: ${JSON.stringify(new Date().toISOString().slice(0, 10))}`,
    "---",
    "",
  ].join("\n");
  const content = Buffer.from(frontmatter + draft.body + "\n", "utf8").toString(
    "base64",
  );

  const endpoint = `${GITHUB_API}/repos/${settings.repoOwner}/${settings.repoName}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  // If the file already exists, the Contents API requires its blob sha.
  let existingSha: string | undefined;
  const probe = await fetch(
    `${endpoint}?ref=${encodeURIComponent(settings.repoBranch)}`,
    { headers },
  );
  if (probe.ok) {
    const body = (await probe.json()) as { sha?: string };
    existingSha = body.sha;
  }

  const response = await fetch(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `content: ${draft.title}`,
      content,
      branch: settings.repoBranch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `GitHub rejected the publish (${response.status}): ${detail.slice(0, 300)}`,
    );
  }
  const result = (await response.json()) as {
    commit?: { sha?: string };
  };
  const commitSha = result.commit?.sha ?? "";

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
