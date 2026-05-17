import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  documentTemplates,
  type DocumentTemplate,
} from "@prismcore/db";

export type { DocumentTemplate };
export type DocumentTemplateStatus = "draft" | "published" | "archived";

export async function listDocumentTemplates(
  tenantId: string,
): Promise<DocumentTemplate[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.tenantId, tenantId))
      .orderBy(desc(documentTemplates.createdAt)),
  );
}

export async function createDocumentTemplate(input: {
  tenantId: string;
  name: string;
  category: string;
  description: string;
  body: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(documentTemplates).values(input);
  });
}

export async function setTemplateStatus(input: {
  tenantId: string;
  id: string;
  status: DocumentTemplateStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(documentTemplates)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(documentTemplates.id, input.id));
  });
}
