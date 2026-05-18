"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createWebsitePage,
  updateWebsitePage,
  setWebsitePageStatus,
  deleteWebsitePage,
  createWebsiteRequest,
  updateWebsiteRequest,
  setWebsiteRequestStatus,
  deleteWebsiteRequest,
  createWebsiteRequestComment,
  deleteWebsiteRequestComment,
  type WebsitePageStatus,
  type WebsiteRequestType,
  type WebsiteRequestPriority,
  type WebsiteRequestStatus,
} from "@/lib/website";

const PATH = "/m/website";

const PAGE_STATUSES: WebsitePageStatus[] = [
  "draft",
  "published",
  "archived",
];
const REQ_TYPES: WebsiteRequestType[] = [
  "content_update",
  "new_page",
  "design",
  "bug",
  "seo",
  "other",
];
const REQ_PRIORITIES: WebsiteRequestPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
];
const REQ_STATUSES: WebsiteRequestStatus[] = [
  "submitted",
  "in_progress",
  "in_review",
  "completed",
  "declined",
];

/* ── Pages ────────────────────────────────────────────────────────── */

export interface WebsitePageForm {
  title: string;
  slug: string;
  status: string;
  summary: string;
  url: string;
  notes: string;
}

function normalizePage(form: WebsitePageForm) {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    status: PAGE_STATUSES.includes(form.status as WebsitePageStatus)
      ? (form.status as WebsitePageStatus)
      : "draft",
    summary: form.summary.trim(),
    url: form.url.trim(),
    notes: form.notes.trim(),
  };
}

export async function newPage(form: WebsitePageForm): Promise<void> {
  if (!form.title.trim()) return;
  const tenant = await getCurrentTenant();
  await createWebsitePage({ tenantId: tenant.id, ...normalizePage(form) });
  revalidatePath(PATH);
}

export async function editPage(
  input: { id: string } & WebsitePageForm,
): Promise<void> {
  if (!input.title.trim()) return;
  const tenant = await getCurrentTenant();
  await updateWebsitePage({
    tenantId: tenant.id,
    id: input.id,
    ...normalizePage(input),
  });
  revalidatePath(PATH);
}

export async function updatePageStatus(input: {
  id: string;
  status: WebsitePageStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setWebsitePageStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath(PATH);
}

export async function removePage(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteWebsitePage(tenant.id, id);
  revalidatePath(PATH);
}

/* ── Change requests ──────────────────────────────────────────────── */

export interface WebsiteRequestForm {
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  requestorName: string;
  pageRef: string;
  resolution: string;
}

function normalizeRequest(form: WebsiteRequestForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    type: REQ_TYPES.includes(form.type as WebsiteRequestType)
      ? (form.type as WebsiteRequestType)
      : "content_update",
    priority: REQ_PRIORITIES.includes(
      form.priority as WebsiteRequestPriority,
    )
      ? (form.priority as WebsiteRequestPriority)
      : "normal",
    status: REQ_STATUSES.includes(form.status as WebsiteRequestStatus)
      ? (form.status as WebsiteRequestStatus)
      : "submitted",
    requestorName: form.requestorName.trim(),
    pageRef: form.pageRef.trim(),
    resolution: form.resolution.trim(),
  };
}

export async function newRequest(form: WebsiteRequestForm): Promise<void> {
  if (!form.title.trim()) return;
  const tenant = await getCurrentTenant();
  await createWebsiteRequest({
    tenantId: tenant.id,
    ...normalizeRequest(form),
  });
  revalidatePath(PATH);
}

export async function editRequest(
  input: { id: string } & WebsiteRequestForm,
): Promise<void> {
  if (!input.title.trim()) return;
  const tenant = await getCurrentTenant();
  await updateWebsiteRequest({
    tenantId: tenant.id,
    id: input.id,
    ...normalizeRequest(input),
  });
  revalidatePath(PATH);
}

export async function updateRequestStatus(input: {
  id: string;
  status: WebsiteRequestStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setWebsiteRequestStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath(PATH);
}

export async function removeRequest(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteWebsiteRequest(tenant.id, id);
  revalidatePath(PATH);
}

/* ── Request comments ─────────────────────────────────────────────── */

export interface RequestCommentForm {
  requestId: string;
  authorName: string;
  body: string;
}

export async function newComment(form: RequestCommentForm): Promise<void> {
  if (!form.requestId || !form.body.trim()) return;
  const tenant = await getCurrentTenant();
  await createWebsiteRequestComment({
    tenantId: tenant.id,
    requestId: form.requestId,
    authorName: form.authorName.trim(),
    body: form.body.trim(),
  });
  revalidatePath(PATH);
}

export async function removeComment(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteWebsiteRequestComment(tenant.id, id);
  revalidatePath(PATH);
}
