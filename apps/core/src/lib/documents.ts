import { desc, eq } from "drizzle-orm";
import { withTenantContext, documents, type Document } from "@prismcore/db";

/**
 * Documents data layer — the tenant's document store. A document row is
 * metadata plus, when a file has been uploaded, a Vercel Blob pointer.
 * RLS-scoped through `withTenantContext`.
 */

export type { Document };

export async function listDocuments(tenantId: string): Promise<Document[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(documents)
      .where(eq(documents.tenantId, tenantId))
      .orderBy(desc(documents.createdAt)),
  );
}

/** Create a register-only document row (no uploaded file). */
export async function createDocument(input: {
  tenantId: string;
  name: string;
  category: string;
  notes: string;
  customValues: Record<string, string>;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(documents).values(input);
  });
}

/**
 * Record a document whose file has just been uploaded to Vercel Blob.
 * Returns the new document id so callers (e.g. an attach flow) can use it.
 */
export async function createUploadedDocument(input: {
  tenantId: string;
  name: string;
  category: string;
  notes: string;
  storageUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}): Promise<string> {
  return withTenantContext(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(documents)
      .values({ ...input, customValues: {} })
      .returning({ id: documents.id });
    return row!.id;
  });
}

/** Update a document's metadata. */
export async function updateDocument(input: {
  tenantId: string;
  id: string;
  name: string;
  category: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(documents)
      .set({
        name: input.name,
        category: input.category,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, input.id));
  });
}

export async function getDocument(
  tenantId: string,
  id: string,
): Promise<Document | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return row ?? null;
  });
}

export async function deleteDocument(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(documents).where(eq(documents.id, id));
  });
}
