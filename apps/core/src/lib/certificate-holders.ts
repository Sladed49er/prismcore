import { asc, eq } from "drizzle-orm";
import {
  withTenantContext,
  certificateHolders,
  type CertificateHolder,
} from "@prismcore/db";

export type { CertificateHolder };

export async function listCertificateHolders(
  tenantId: string,
): Promise<CertificateHolder[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(certificateHolders)
      .where(eq(certificateHolders.tenantId, tenantId))
      .orderBy(asc(certificateHolders.name)),
  );
}

export async function createCertificateHolder(input: {
  tenantId: string;
  name: string;
  address: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(certificateHolders).values(input);
  });
}
