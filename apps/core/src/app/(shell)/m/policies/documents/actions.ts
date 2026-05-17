"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createPolicyDocument,
  type PolicyDocumentType,
} from "@/lib/policy-documents";

export async function newPolicyDocument(input: {
  policyId: string;
  documentType: PolicyDocumentType;
  title: string;
  reference: string;
  issuedDate: string;
  notes: string;
}): Promise<void> {
  if (!input.policyId || !input.title.trim()) return;
  const tenant = await getCurrentTenant();
  await createPolicyDocument({
    tenantId: tenant.id,
    policyId: input.policyId,
    documentType: input.documentType,
    title: input.title.trim(),
    reference: input.reference.trim(),
    issuedDate: input.issuedDate || null,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/policies/documents");
}
