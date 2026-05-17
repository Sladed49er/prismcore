import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  contingencyIncome,
  type ContingencyIncome,
} from "@prismcore/db";

export type { ContingencyIncome };
export type ContingencyIncomeType =
  | "contingency"
  | "profit_share"
  | "bonus"
  | "growth";
export type ContingencyStatus = "projected" | "received" | "closed";

export async function listContingencyIncome(
  tenantId: string,
): Promise<ContingencyIncome[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(contingencyIncome)
      .where(eq(contingencyIncome.tenantId, tenantId))
      .orderBy(desc(contingencyIncome.year)),
  );
}

export async function createContingencyIncome(input: {
  tenantId: string;
  carrierName: string;
  year: string;
  incomeType: ContingencyIncomeType;
  expectedCents: number;
  receivedCents: number;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(contingencyIncome).values(input);
  });
}

export async function setContingencyStatus(input: {
  tenantId: string;
  id: string;
  status: ContingencyStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(contingencyIncome)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(contingencyIncome.id, input.id));
  });
}
