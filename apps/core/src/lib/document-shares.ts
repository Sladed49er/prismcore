import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  documentShares,
  documents,
  type DocumentShare,
} from "@prismcore/db";

export type { DocumentShare };
export type DocumentShareStatus = "active" | "expired" | "revoked";

export interface DocumentShareRow extends DocumentShare {
  documentName: string;
}

export async function listDocumentShares(
  tenantId: string,
): Promise<DocumentShareRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ share: documentShares, document: documents })
      .from(documentShares)
      .leftJoin(documents, eq(documentShares.documentId, documents.id))
      .where(eq(documentShares.tenantId, tenantId))
      .orderBy(desc(documentShares.createdAt));
    return rows.map((r) => ({
      ...r.share,
      documentName: r.document?.name ?? "—",
    }));
  });
}

export async function createDocumentShare(input: {
  tenantId: string;
  documentId: string;
  label: string;
  recipient: string;
  expiresDate: string | null;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(documentShares).values(input);
  });
}

export async function setShareStatus(input: {
  tenantId: string;
  id: string;
  status: DocumentShareStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(documentShares)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(documentShares.id, input.id));
  });
}
