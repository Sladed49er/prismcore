"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCertificateRequest,
  setCertificateRequestStatus,
  type CertificateRequestStatus,
} from "@/lib/certificate-requests";

export async function newCertificateRequest(input: {
  holderName: string;
  requestedBy: string;
  policyReference: string;
  neededByDate: string;
  notes: string;
}): Promise<void> {
  if (!input.holderName.trim()) return;
  const tenant = await getCurrentTenant();
  await createCertificateRequest({
    tenantId: tenant.id,
    holderName: input.holderName.trim(),
    requestedBy: input.requestedBy.trim(),
    policyReference: input.policyReference.trim(),
    neededByDate: input.neededByDate || null,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/certificates/requests");
}

export async function updateCertificateRequestStatus(input: {
  id: string;
  status: CertificateRequestStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setCertificateRequestStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/certificates/requests");
}
