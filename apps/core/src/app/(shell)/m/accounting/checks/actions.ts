"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCheck,
  setCheckStatus,
  updateCheck,
  deleteCheck,
  type CheckStatus,
} from "@/lib/checks";

export async function newCheck(input: {
  checkNumber: string;
  payee: string;
  amountDollars: string;
  checkDate: string;
  memo: string;
}): Promise<void> {
  if (!input.checkNumber.trim() || !input.payee.trim()) return;
  const tenant = await getCurrentTenant();
  await createCheck({
    tenantId: tenant.id,
    checkNumber: input.checkNumber.trim(),
    payee: input.payee.trim(),
    amountCents: Math.round((Number.parseFloat(input.amountDollars) || 0) * 100),
    checkDate: input.checkDate || null,
    memo: input.memo.trim(),
  });
  revalidatePath("/m/accounting/checks");
}

export async function updateCheckStatus(input: {
  id: string;
  status: CheckStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setCheckStatus({ tenantId: tenant.id, id: input.id, status: input.status });
  revalidatePath("/m/accounting/checks");
}

export async function editCheck(input: {
  id: string;
  checkNumber: string;
  payee: string;
  amountDollars: string;
  checkDate: string;
  memo: string;
}): Promise<void> {
  if (!input.id || !input.checkNumber.trim() || !input.payee.trim()) return;
  const tenant = await getCurrentTenant();
  await updateCheck({
    tenantId: tenant.id,
    id: input.id,
    checkNumber: input.checkNumber.trim(),
    payee: input.payee.trim(),
    amountCents: Math.round(
      (Number.parseFloat(input.amountDollars) || 0) * 100,
    ),
    checkDate: input.checkDate || null,
    memo: input.memo.trim(),
  });
  revalidatePath("/m/accounting/checks");
}

export async function removeCheck(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deleteCheck(tenant.id, id);
  revalidatePath("/m/accounting/checks");
}
