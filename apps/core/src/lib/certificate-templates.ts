import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  certificateTemplates,
  type CertificateTemplate,
} from "@prismcore/db";

export type { CertificateTemplate };
export type CertificateTemplateStatus =
  | "draft"
  | "published"
  | "archived";

export async function listCertificateTemplates(
  tenantId: string,
): Promise<CertificateTemplate[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(certificateTemplates)
      .where(eq(certificateTemplates.tenantId, tenantId))
      .orderBy(desc(certificateTemplates.createdAt)),
  );
}

export async function createCertificateTemplate(input: {
  tenantId: string;
  name: string;
  description: string;
  coverageSummary: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(certificateTemplates).values(input);
  });
}

export async function setCertificateTemplateStatus(input: {
  tenantId: string;
  id: string;
  status: CertificateTemplateStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(certificateTemplates)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(certificateTemplates.id, input.id));
  });
}
