"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createContingencyIncome,
  setContingencyStatus,
  type ContingencyIncomeType,
  type ContingencyStatus,
} from "@/lib/contingency";

export async function newContingencyIncome(input: {
  carrierName: string;
  year: string;
  incomeType: ContingencyIncomeType;
  expectedDollars: string;
  receivedDollars: string;
  notes: string;
}): Promise<void> {
  if (!input.carrierName.trim()) return;
  const tenant = await getCurrentTenant();
  const dollars = (v: string): number =>
    Math.round((Number.parseFloat(v) || 0) * 100);
  await createContingencyIncome({
    tenantId: tenant.id,
    carrierName: input.carrierName.trim(),
    year: input.year.trim(),
    incomeType: input.incomeType,
    expectedCents: dollars(input.expectedDollars),
    receivedCents: dollars(input.receivedDollars),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/commissions/contingency");
}

export async function updateContingencyStatus(input: {
  id: string;
  status: ContingencyStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setContingencyStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/commissions/contingency");
}
