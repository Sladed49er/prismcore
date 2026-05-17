"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCertificateTemplate,
  setCertificateTemplateStatus,
  type CertificateTemplateStatus,
} from "@/lib/certificate-templates";

export async function newCertificateTemplate(input: {
  name: string;
  description: string;
  coverageSummary: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createCertificateTemplate({
    tenantId: tenant.id,
    name: input.name.trim(),
    description: input.description.trim(),
    coverageSummary: input.coverageSummary.trim(),
  });
  revalidatePath("/m/certificates/templates");
}

export async function updateCertificateTemplateStatus(input: {
  id: string;
  status: CertificateTemplateStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setCertificateTemplateStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/certificates/templates");
}
