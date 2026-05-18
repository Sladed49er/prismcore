import { asc, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  websitePages,
  websiteRequests,
  websiteRequestComments,
  type WebsitePage,
  type WebsiteRequest,
  type WebsiteRequestComment,
} from "@prismcore/db";

/**
 * Website data layer — the agency's page inventory, website change-request
 * queue, and the comment thread on each request. RLS-scoped through
 * `withTenantContext`.
 */

export type { WebsitePage, WebsiteRequest, WebsiteRequestComment };

export type WebsitePageStatus = "draft" | "published" | "archived";

export type WebsiteRequestType =
  | "content_update"
  | "new_page"
  | "design"
  | "bug"
  | "seo"
  | "other";

export type WebsiteRequestPriority = "low" | "normal" | "high" | "urgent";

export type WebsiteRequestStatus =
  | "submitted"
  | "in_progress"
  | "in_review"
  | "completed"
  | "declined";

/* ── Pages ────────────────────────────────────────────────────────── */

export async function listWebsitePages(
  tenantId: string,
): Promise<WebsitePage[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(websitePages)
      .where(eq(websitePages.tenantId, tenantId))
      .orderBy(websitePages.slug),
  );
}

export async function createWebsitePage(input: {
  tenantId: string;
  title: string;
  slug: string;
  status: WebsitePageStatus;
  summary: string;
  url: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(websitePages).values(input);
  });
}

export async function updateWebsitePage(input: {
  tenantId: string;
  id: string;
  title: string;
  slug: string;
  status: WebsitePageStatus;
  summary: string;
  url: string;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(websitePages)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(websitePages.id, id));
  });
}

export async function setWebsitePageStatus(input: {
  tenantId: string;
  id: string;
  status: WebsitePageStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(websitePages)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(websitePages.id, input.id));
  });
}

export async function deleteWebsitePage(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(websitePages).where(eq(websitePages.id, id));
  });
}

/* ── Change requests ──────────────────────────────────────────────── */

export async function listWebsiteRequests(
  tenantId: string,
): Promise<WebsiteRequest[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(websiteRequests)
      .where(eq(websiteRequests.tenantId, tenantId))
      .orderBy(desc(websiteRequests.createdAt)),
  );
}

export async function createWebsiteRequest(input: {
  tenantId: string;
  title: string;
  description: string;
  type: WebsiteRequestType;
  priority: WebsiteRequestPriority;
  status: WebsiteRequestStatus;
  requestorName: string;
  pageRef: string;
  resolution: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(websiteRequests).values(input);
  });
}

export async function updateWebsiteRequest(input: {
  tenantId: string;
  id: string;
  title: string;
  description: string;
  type: WebsiteRequestType;
  priority: WebsiteRequestPriority;
  status: WebsiteRequestStatus;
  requestorName: string;
  pageRef: string;
  resolution: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(websiteRequests)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(websiteRequests.id, id));
  });
}

export async function setWebsiteRequestStatus(input: {
  tenantId: string;
  id: string;
  status: WebsiteRequestStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(websiteRequests)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(websiteRequests.id, input.id));
  });
}

export async function deleteWebsiteRequest(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(websiteRequests).where(eq(websiteRequests.id, id));
  });
}

/* ── Request comments ─────────────────────────────────────────────── */

export interface WebsiteRequestCommentRow extends WebsiteRequestComment {
  requestTitle: string;
}

export async function listWebsiteRequestComments(
  tenantId: string,
): Promise<WebsiteRequestCommentRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        comment: websiteRequestComments,
        request: websiteRequests,
      })
      .from(websiteRequestComments)
      .leftJoin(
        websiteRequests,
        eq(websiteRequestComments.requestId, websiteRequests.id),
      )
      .where(eq(websiteRequestComments.tenantId, tenantId))
      .orderBy(asc(websiteRequestComments.createdAt));
    return rows.map((r) => ({
      ...r.comment,
      requestTitle: r.request?.title ?? "—",
    }));
  });
}

export async function createWebsiteRequestComment(input: {
  tenantId: string;
  requestId: string;
  authorName: string;
  body: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(websiteRequestComments).values(input);
  });
}

export async function deleteWebsiteRequestComment(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(websiteRequestComments)
      .where(eq(websiteRequestComments.id, id));
  });
}
