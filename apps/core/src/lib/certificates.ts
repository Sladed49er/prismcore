import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  certificates,
  policies,
  clients,
  type Certificate,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { Certificate };
export type CertificateStatus = "draft" | "issued" | "expired";

export interface CertificateRow extends Certificate {
  policyNumber: string;
  clientName: string;
}

export async function listCertificates(
  tenantId: string,
): Promise<CertificateRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ cert: certificates, policy: policies, client: clients })
      .from(certificates)
      .leftJoin(policies, eq(certificates.policyId, policies.id))
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .where(eq(certificates.tenantId, tenantId))
      .orderBy(desc(certificates.createdAt));
    return rows.map((r) => ({
      ...r.cert,
      policyNumber: r.policy?.policyNumber ?? "—",
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createCertificate(input: {
  tenantId: string;
  policyId: string;
  certNumber: string;
  holderName: string;
  issuedDate: string | null;
  status: CertificateStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(certificates).values(input);
  });
}
