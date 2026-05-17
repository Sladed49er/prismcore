"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createPayRun,
  setPayRunStatus,
  updatePayRun,
  deletePayRun,
} from "@/lib/payroll";

export async function newPayRun(input: {
  label: string;
  payDate: string;
}): Promise<void> {
  if (!input.label.trim()) return;
  const tenant = await getCurrentTenant();
  await createPayRun({
    tenantId: tenant.id,
    label: input.label.trim(),
    payDate: input.payDate || null,
  });
  revalidatePath("/m/accounting/payroll");
}

export async function postPayRun(runId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await setPayRunStatus(tenant.id, runId, "posted");
  revalidatePath("/m/accounting/payroll");
}

export async function editPayRun(input: {
  id: string;
  label: string;
  payDate: string;
}): Promise<void> {
  if (!input.id || !input.label.trim()) return;
  const tenant = await getCurrentTenant();
  await updatePayRun({
    tenantId: tenant.id,
    id: input.id,
    label: input.label.trim(),
    payDate: input.payDate || null,
  });
  revalidatePath("/m/accounting/payroll");
}

export async function removePayRun(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deletePayRun(tenant.id, id);
  revalidatePath("/m/accounting/payroll");
}
