"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCertificate,
  type CertificateStatus,
} from "@/lib/certificates";

export async function addCertificate(input: {
  policyId: string;
  certNumber: string;
  holderName: string;
  issuedDate: string;
  status: CertificateStatus;
}): Promise<void> {
  if (!input.policyId || !input.holderName.trim()) return;
  const tenant = await getCurrentTenant();
  await createCertificate({
    tenantId: tenant.id,
    policyId: input.policyId,
    certNumber: input.certNumber.trim(),
    holderName: input.holderName.trim(),
    issuedDate: input.issuedDate || null,
    status: input.status,
  });
  revalidatePath("/m/certificates");
}
