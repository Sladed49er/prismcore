"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createSeoKeyword,
  updateSeoKeyword,
  deleteSeoKeyword,
  listSeoKeywords,
  updateSeoDraft,
  setSeoDraftStatus,
  deleteSeoDraft,
  upsertSeoSettings,
  type SeoKeywordStatus,
  type SeoDraftStatus,
  type SeoPublishMode,
  type SeoPublishFormat,
} from "@/lib/seo";
import { generateArticleDraft } from "@/lib/seo-content-engine";
import { publishDraft } from "@/lib/seo-publisher";
import {
  runSeoAudit,
  validateAuditUrl,
  type AuditReport,
} from "@/lib/seo-audit";
import {
  runDeepSiteAudit,
  type SiteAuditReport,
} from "@/lib/seo-site-audit";
import {
  freshSiteAudit,
  saveSiteAudit,
  getSiteAudit,
} from "@/lib/seo-audit-store";

const PATH = "/m/seo_engine";

const KEYWORD_STATUSES: SeoKeywordStatus[] = ["tracked", "paused"];
const DRAFT_STATUSES: SeoDraftStatus[] = [
  "draft",
  "in_review",
  "approved",
  "published",
  "discarded",
];
const PUBLISH_MODES: SeoPublishMode[] = ["github_commit", "manual"];
const PUBLISH_FORMATS: SeoPublishFormat[] = ["markdown_file", "posts_json"];
const INTENTS = [
  "informational",
  "commercial",
  "transactional",
  "navigational",
];

/* ── Keywords ─────────────────────────────────────────────────────── */

export interface SeoKeywordForm {
  phrase: string;
  cluster: string;
  intent: string;
  notes: string;
}

function normalizeKeyword(form: SeoKeywordForm) {
  return {
    phrase: form.phrase.trim(),
    cluster: form.cluster.trim(),
    intent: INTENTS.includes(form.intent) ? form.intent : "informational",
    notes: form.notes.trim(),
  };
}

export async function newKeyword(form: SeoKeywordForm): Promise<void> {
  if (!form.phrase.trim()) return;
  const tenant = await getCurrentTenant();
  await createSeoKeyword({ tenantId: tenant.id, ...normalizeKeyword(form) });
  revalidatePath(PATH);
}

export async function editKeyword(
  input: { id: string; status: string } & SeoKeywordForm,
): Promise<void> {
  if (!input.phrase.trim()) return;
  const tenant = await getCurrentTenant();
  await updateSeoKeyword({
    tenantId: tenant.id,
    id: input.id,
    status: KEYWORD_STATUSES.includes(input.status as SeoKeywordStatus)
      ? (input.status as SeoKeywordStatus)
      : "tracked",
    ...normalizeKeyword(input),
  });
  revalidatePath(PATH);
}

export async function removeKeyword(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteSeoKeyword(tenant.id, id);
  revalidatePath(PATH);
}

/* ── Content generation ───────────────────────────────────────────── */

export interface GenerateResult {
  ok: boolean;
  message: string;
}

export async function generateDraft(
  keywordId: string,
): Promise<GenerateResult> {
  const tenant = await getCurrentTenant();
  const keyword = (await listSeoKeywords(tenant.id)).find(
    (k) => k.id === keywordId,
  );
  if (!keyword) return { ok: false, message: "Keyword not found." };
  try {
    const title = await generateArticleDraft({
      tenantId: tenant.id,
      keyword,
    });
    revalidatePath(PATH);
    return { ok: true, message: `Drafted "${title}" — ready for review.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Generation failed.",
    };
  }
}

/* ── Drafts ───────────────────────────────────────────────────────── */

export interface SeoDraftForm {
  title: string;
  slug: string;
  metaDescription: string;
  body: string;
}

export async function editDraft(
  input: { id: string } & SeoDraftForm,
): Promise<void> {
  if (!input.title.trim()) return;
  const tenant = await getCurrentTenant();
  await updateSeoDraft({
    tenantId: tenant.id,
    id: input.id,
    title: input.title.trim(),
    slug: input.slug.trim(),
    metaDescription: input.metaDescription.trim(),
    body: input.body,
  });
  revalidatePath(PATH);
}

export async function updateDraftStatus(input: {
  id: string;
  status: SeoDraftStatus;
}): Promise<void> {
  if (!DRAFT_STATUSES.includes(input.status)) return;
  const tenant = await getCurrentTenant();
  await setSeoDraftStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath(PATH);
}

export async function removeDraft(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteSeoDraft(tenant.id, id);
  revalidatePath(PATH);
}

export async function publishApprovedDraft(
  id: string,
): Promise<GenerateResult> {
  const tenant = await getCurrentTenant();
  try {
    const result = await publishDraft({ tenantId: tenant.id, draftId: id });
    revalidatePath(PATH);
    return {
      ok: true,
      message: result.url
        ? `Published — live at ${result.url} once the site rebuilds.`
        : `Published — committed as ${result.path}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Publish failed.",
    };
  }
}

/* ── One-off audit ────────────────────────────────────────────────── */

export async function auditUrl(url: string): Promise<AuditReport> {
  await getCurrentTenant(); // authenticated use only; result is not persisted
  try {
    return await runSeoAudit(url);
  } catch (error) {
    return {
      url,
      fetched: false,
      error: error instanceof Error ? error.message : "Audit failed.",
      checks: [],
      suggestions: [],
    };
  }
}

export async function deepAuditSite(
  url: string,
  force = false,
): Promise<SiteAuditReport> {
  const tenant = await getCurrentTenant();
  const ownerKey = `tenant:${tenant.id}`;
  const origin = validateAuditUrl(url).origin;
  if (!force) {
    const saved = await freshSiteAudit(ownerKey, origin);
    if (saved) return saved;
  }
  const report = await runDeepSiteAudit(origin);
  if (!report.error) await saveSiteAudit(ownerKey, report);
  return report;
}

export async function loadSavedTenantAudit(
  id: string,
): Promise<SiteAuditReport | null> {
  const tenant = await getCurrentTenant();
  return (await getSiteAudit(`tenant:${tenant.id}`, id)) ?? null;
}

/* ── Settings ─────────────────────────────────────────────────────── */

export interface SeoSettingsForm {
  siteUrl: string;
  brandBrief: string;
  publishMode: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  contentDir: string;
  publishFormat: string;
  urlPrefix: string;
}

export async function saveSettings(form: SeoSettingsForm): Promise<void> {
  const tenant = await getCurrentTenant();
  await upsertSeoSettings({
    tenantId: tenant.id,
    siteUrl: form.siteUrl.trim(),
    brandBrief: form.brandBrief.trim(),
    publishMode: PUBLISH_MODES.includes(form.publishMode as SeoPublishMode)
      ? (form.publishMode as SeoPublishMode)
      : "manual",
    repoOwner: form.repoOwner.trim(),
    repoName: form.repoName.trim(),
    repoBranch: form.repoBranch.trim() || "main",
    contentDir: form.contentDir.trim(),
    publishFormat: PUBLISH_FORMATS.includes(
      form.publishFormat as SeoPublishFormat,
    )
      ? (form.publishFormat as SeoPublishFormat)
      : "markdown_file",
    urlPrefix: form.urlPrefix.trim(),
  });
  revalidatePath(PATH);
}
