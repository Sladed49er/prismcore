import { and, desc, eq, inArray } from "drizzle-orm";
import {
  withTenantContext,
  documentAttachments,
  documents,
} from "@prismcore/db";

/**
 * Document-attachments data layer — the polymorphic link between a stored
 * document and any record in any module. All RLS-scoped through
 * `withTenantContext`; an attachment is reachable only from its own tenant.
 */

/** One attached file, flattened with the document fields a UI needs. */
export interface AttachmentRow {
  id: string;
  documentId: string;
  name: string;
  caption: string;
  storageUrl: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  attachedByName: string;
  createdAt: Date;
}

/** Every document attached to one entity record, newest first. */
export async function listAttachments(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<AttachmentRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: documentAttachments.id,
        documentId: documents.id,
        name: documents.name,
        caption: documentAttachments.caption,
        storageUrl: documents.storageUrl,
        fileName: documents.fileName,
        fileSizeBytes: documents.fileSizeBytes,
        mimeType: documents.mimeType,
        attachedByName: documentAttachments.attachedByName,
        createdAt: documentAttachments.createdAt,
      })
      .from(documentAttachments)
      .innerJoin(documents, eq(documents.id, documentAttachments.documentId))
      .where(
        and(
          eq(documentAttachments.entityType, entityType),
          eq(documentAttachments.entityId, entityId),
        ),
      )
      .orderBy(desc(documentAttachments.createdAt));
    return rows;
  });
}

/**
 * Every attachment for a set of entity records of one type, grouped by
 * entity id — for list views that render attachments on each row in a
 * single round trip.
 */
export async function listAttachmentsByEntity(
  tenantId: string,
  entityType: string,
  entityIds: string[],
): Promise<Record<string, AttachmentRow[]>> {
  if (entityIds.length === 0) return {};
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        entityId: documentAttachments.entityId,
        id: documentAttachments.id,
        documentId: documents.id,
        name: documents.name,
        caption: documentAttachments.caption,
        storageUrl: documents.storageUrl,
        fileName: documents.fileName,
        fileSizeBytes: documents.fileSizeBytes,
        mimeType: documents.mimeType,
        attachedByName: documentAttachments.attachedByName,
        createdAt: documentAttachments.createdAt,
      })
      .from(documentAttachments)
      .innerJoin(documents, eq(documents.id, documentAttachments.documentId))
      .where(
        and(
          eq(documentAttachments.entityType, entityType),
          inArray(documentAttachments.entityId, entityIds),
        ),
      )
      .orderBy(desc(documentAttachments.createdAt));
    const grouped: Record<string, AttachmentRow[]> = {};
    for (const { entityId, ...rest } of rows) {
      (grouped[entityId] ??= []).push(rest);
    }
    return grouped;
  });
}

/**
 * How many documents are attached to each of the given entity ids — for
 * list views that want a badge without fetching every attachment.
 */
export async function countAttachments(
  tenantId: string,
  entityType: string,
  entityIds: string[],
): Promise<Record<string, number>> {
  if (entityIds.length === 0) return {};
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ entityId: documentAttachments.entityId })
      .from(documentAttachments)
      .where(
        and(
          eq(documentAttachments.entityType, entityType),
          inArray(documentAttachments.entityId, entityIds),
        ),
      );
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.entityId] = (counts[r.entityId] ?? 0) + 1;
    return counts;
  });
}

/** Link an existing document to an entity record. Returns the link id. */
export async function attachDocument(input: {
  tenantId: string;
  documentId: string;
  entityType: string;
  entityId: string;
  caption?: string;
  attachedByName?: string;
}): Promise<string> {
  return withTenantContext(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(documentAttachments)
      .values({
        tenantId: input.tenantId,
        documentId: input.documentId,
        entityType: input.entityType,
        entityId: input.entityId,
        caption: input.caption ?? "",
        attachedByName: input.attachedByName ?? "User",
      })
      .returning({ id: documentAttachments.id });
    return row!.id;
  });
}

/** Remove an attachment link. The underlying document is left in place. */
export async function detachDocument(
  tenantId: string,
  attachmentId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(documentAttachments)
      .where(eq(documentAttachments.id, attachmentId));
  });
}
