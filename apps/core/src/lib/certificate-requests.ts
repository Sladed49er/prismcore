import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  certificateRequests,
  type CertificateRequest,
} from "@prismcore/db";

export type { CertificateRequest };
export type CertificateRequestStatus = "open" | "issued" | "declined";

export async function listCertificateRequests(
  tenantId: string,
): Promise<CertificateRequest[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(certificateRequests)
      .where(eq(certificateRequests.tenantId, tenantId))
      .orderBy(desc(certificateRequests.createdAt)),
  );
}

export async function createCertificateRequest(input: {
  tenantId: string;
  holderName: string;
  requestedBy: string;
  policyReference: string;
  neededByDate: string | null;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(certificateRequests).values(input);
  });
}

export async function setCertificateRequestStatus(input: {
  tenantId: string;
  id: string;
  status: CertificateRequestStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(certificateRequests)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(certificateRequests.id, input.id));
  });
}
