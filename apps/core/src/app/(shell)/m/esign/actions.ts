"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createSignatureRequest,
  setEsignStatus,
  type EsignStatus,
} from "@/lib/esign";

export async function addSignatureRequest(input: {
  documentName: string;
  signerName: string;
  signerEmail: string;
  status: EsignStatus;
  sentDate: string;
}): Promise<void> {
  if (!input.documentName.trim() || !input.signerName.trim()) return;
  const tenant = await getCurrentTenant();
  await createSignatureRequest({
    tenantId: tenant.id,
    documentName: input.documentName.trim(),
    signerName: input.signerName.trim(),
    signerEmail: input.signerEmail.trim(),
    status: input.status,
    sentDate: input.sentDate || null,
  });
  revalidatePath("/m/esign");
}

export async function advanceEsign(
  requestId: string,
  status: EsignStatus,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setEsignStatus(tenant.id, requestId, status);
  revalidatePath("/m/esign");
}
