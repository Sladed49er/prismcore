import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  vendorContracts,
  type VendorContract,
} from "@prismcore/db";

/**
 * Vendor contracts data layer — the agency's vendor agreements and their
 * renewal dates. RLS-scoped through `withTenantContext`.
 */

export type { VendorContract };

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
