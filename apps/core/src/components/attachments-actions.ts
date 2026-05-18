"use server";

import { getCurrentTenant } from "@/lib/current-tenant";
import { detachDocument } from "@/lib/document-attachments";

/**
 * Server action behind the reusable <Attachments> component. Removing an
 * attachment unlinks the file from the record; the document itself stays in
 * the library. Tenant-scoped — a tenant can only detach its own attachments.
 */
export async function detachDocumentAction(
  attachmentId: string,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await detachDocument(tenant.id, attachmentId);
}
