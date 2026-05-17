"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createDocumentShare,
  setShareStatus,
  type DocumentShareStatus,
} from "@/lib/document-shares";

export async function newDocumentShare(input: {
  documentId: string;
  label: string;
  recipient: string;
  expiresDate: string;
  notes: string;
}): Promise<void> {
  if (!input.documentId) return;
  const tenant = await getCurrentTenant();
  await createDocumentShare({
    tenantId: tenant.id,
    documentId: input.documentId,
    label: input.label.trim(),
    recipient: input.recipient.trim(),
    expiresDate: input.expiresDate || null,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/documents/shares");
}

export async function updateShareStatus(input: {
  id: string;
  status: DocumentShareStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setShareStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/documents/shares");
}
