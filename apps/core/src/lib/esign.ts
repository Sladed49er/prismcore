import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  signatureRequests,
  type SignatureRequest,
} from "@prismcore/db";

export type { SignatureRequest };
export type EsignStatus = "draft" | "sent" | "signed" | "declined";

export async function listSignatureRequests(
  tenantId: string,
): Promise<SignatureRequest[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(signatureRequests)
      .where(eq(signatureRequests.tenantId, tenantId))
      .orderBy(desc(signatureRequests.createdAt)),
  );
}

export async function createSignatureRequest(input: {
  tenantId: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  status: EsignStatus;
  sentDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(signatureRequests).values(input);
  });
}

export async function setEsignStatus(
  tenantId: string,
  requestId: string,
  status: EsignStatus,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(signatureRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(signatureRequests.id, requestId));
  });
}
