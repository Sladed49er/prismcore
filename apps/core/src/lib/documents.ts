import { desc, eq } from "drizzle-orm";
import { withTenantContext, documents, type Document } from "@prismcore/db";

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
