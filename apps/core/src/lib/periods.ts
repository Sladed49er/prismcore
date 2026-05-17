import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  accountingPeriods,
  type AccountingPeriod,
} from "@prismcore/db";

export type { AccountingPeriod };
export type PeriodStatus = "open" | "closed";

export async function listPeriods(
  tenantId: string,
): Promise<AccountingPeriod[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(accountingPeriods)
      .where(eq(accountingPeriods.tenantId, tenantId))
      .orderBy(desc(accountingPeriods.startDate)),
  );
}

export async function createPeriod(input: {
  tenantId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(accountingPeriods).values(input);
  });
}

export async function updatePeriod(input: {
  tenantId: string;
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(accountingPeriods)
      .set({
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        updatedAt: new Date(),
      })
      .where(eq(accountingPeriods.id, input.id));
  });
}

export async function deletePeriod(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(accountingPeriods).where(eq(accountingPeriods.id, id));
  });
}

export async function setPeriodStatus(input: {
  tenantId: string;
  id: string;
  status: PeriodStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(accountingPeriods)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(accountingPeriods.id, input.id));
  });
}
