import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  policyDocuments,
  policies,
  type PolicyDocument,
} from "@prismcore/db";

export type { PolicyDocument };
export type PolicyDocumentType =
  | "id_card"
  | "dec_page"
  | "certificate"
  | "endorsement_copy"
  | "application"
  | "other";

export interface PolicyDocumentRow extends PolicyDocument {
  policyNumber: string;
}

export async function listPolicyDocuments(
  tenantId: string,
): Promise<PolicyDocumentRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ doc: policyDocuments, policy: policies })
      .from(policyDocuments)
      .leftJoin(policies, eq(policyDocuments.policyId, policies.id))
      .where(eq(policyDocuments.tenantId, tenantId))
      .orderBy(desc(policyDocuments.createdAt));
    return rows.map((r) => ({
      ...r.doc,
      policyNumber: r.policy?.policyNumber ?? "—",
    }));
  });
}

export async function createPolicyDocument(input: {
  tenantId: string;
  policyId: string;
  documentType: PolicyDocumentType;
  title: string;
  reference: string;
  issuedDate: string | null;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(policyDocuments).values(input);
  });
}
