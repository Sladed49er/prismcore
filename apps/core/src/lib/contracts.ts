import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  vendorContracts,
  contractDocuments,
  type VendorContract,
  type ContractDocument,
} from "@prismcore/db";

/**
 * Vendor contracts data layer — the agency's vendor agreements, their renewal
 * dates, and the documents attached to each. RLS-scoped through
 * `withTenantContext`.
 */

export type { VendorContract, ContractDocument };

export type ContractCategory =
  | "software"
  | "services"
  | "lease"
  | "equipment"
  | "insurance"
  | "other";

export type ContractStatus = "active" | "pending" | "expired" | "cancelled";

export async function listContracts(
  tenantId: string,
): Promise<VendorContract[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(vendorContracts)
      .where(eq(vendorContracts.tenantId, tenantId))
      .orderBy(desc(vendorContracts.endDate)),
  );
}

export async function createContract(input: {
  tenantId: string;
  vendorName: string;
  title: string;
  category: ContractCategory;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  annualValueCents: number;
  autoRenew: boolean;
  noticePeriodDays: number;
  ownerName: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(vendorContracts).values(input);
  });
}

export async function updateContract(input: {
  tenantId: string;
  id: string;
  vendorName: string;
  title: string;
  category: ContractCategory;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  annualValueCents: number;
  autoRenew: boolean;
  noticePeriodDays: number;
  ownerName: string;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(vendorContracts)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(vendorContracts.id, id));
  });
}

export async function setContractStatus(input: {
  tenantId: string;
  id: string;
  status: ContractStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(vendorContracts)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(vendorContracts.id, input.id));
  });
}

export async function deleteContract(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(vendorContracts).where(eq(vendorContracts.id, id));
  });
}

/* ── Documents ────────────────────────────────────────────────────── */

export interface ContractDocumentRow extends ContractDocument {
  contractLabel: string;
}

export async function listContractDocuments(
  tenantId: string,
): Promise<ContractDocumentRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ doc: contractDocuments, contract: vendorContracts })
      .from(contractDocuments)
      .leftJoin(
        vendorContracts,
        eq(contractDocuments.contractId, vendorContracts.id),
      )
      .where(eq(contractDocuments.tenantId, tenantId))
      .orderBy(desc(contractDocuments.createdAt));
    return rows.map((r) => ({
      ...r.doc,
      contractLabel: r.contract
        ? [r.contract.vendorName, r.contract.title]
            .filter(Boolean)
            .join(" — ")
        : "—",
    }));
  });
}

export async function createContractDocument(input: {
  tenantId: string;
  contractId: string;
  name: string;
  docType: string;
  url: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(contractDocuments).values(input);
  });
}

export async function deleteContractDocument(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(contractDocuments)
      .where(eq(contractDocuments.id, id));
  });
}
