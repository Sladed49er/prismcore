import { asc, eq } from "drizzle-orm";
import {
  withTenantContext,
  documentFolders,
  type DocumentFolder,
} from "@prismcore/db";

export type { DocumentFolder };

export async function listDocumentFolders(
  tenantId: string,
): Promise<DocumentFolder[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(documentFolders)
      .where(eq(documentFolders.tenantId, tenantId))
      .orderBy(asc(documentFolders.name)),
  );
}

export async function createDocumentFolder(input: {
  tenantId: string;
  name: string;
  description: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(documentFolders).values(input);
  });
}
