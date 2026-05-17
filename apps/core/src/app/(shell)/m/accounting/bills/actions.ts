"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createBill, recordBillPayment } from "@/lib/ap";

export async function addBill(input: {
  vendorId: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  amountDollars: string;
  memo: string;
}): Promise<void> {
  if (!input.vendorId || !input.billNumber.trim()) return;
  const tenant = await getCurrentTenant();
  await createBill({
    tenantId: tenant.id,
    vendorId: input.vendorId,
    billNumber: input.billNumber.trim(),
    billDate: input.billDate || null,
    dueDate: input.dueDate || null,
    amountCents: Math.round((Number.parseFloat(input.amountDollars) || 0) * 100),
    memo: input.memo.trim(),
  });
  revalidatePath("/m/accounting/bills");
}

export async function payBill(
  billId: string,
  amountDollars: string,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await recordBillPayment(
    tenant.id,
    billId,
    Math.round((Number.parseFloat(amountDollars) || 0) * 100),
  );
  revalidatePath("/m/accounting/bills");
}
