"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createPeriod,
  setPeriodStatus,
  updatePeriod,
  deletePeriod,
  type PeriodStatus,
} from "@/lib/periods";

export async function newPeriod(input: {
  name: string;
  startDate: string;
  endDate: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createPeriod({
    tenantId: tenant.id,
    name: input.name.trim(),
    startDate: input.startDate || null,
    endDate: input.endDate || null,
  });
  revalidatePath("/m/accounting/fiscal-periods");
}

export async function updatePeriodStatus(input: {
  id: string;
  status: PeriodStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setPeriodStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/accounting/fiscal-periods");
}

export async function editPeriod(input: {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}): Promise<void> {
  if (!input.id || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updatePeriod({
    tenantId: tenant.id,
    id: input.id,
    name: input.name.trim(),
    startDate: input.startDate || null,
    endDate: input.endDate || null,
  });
  revalidatePath("/m/accounting/fiscal-periods");
}

export async function removePeriod(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deletePeriod(tenant.id, id);
  revalidatePath("/m/accounting/fiscal-periods");
}
