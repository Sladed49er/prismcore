"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  generateDuesInvoice,
  generateAnnualDues,
  recordDuesPayment,
  voidDuesInvoice,
} from "@/lib/membership-dues";

const PATH = "/m/memberships/dues";

/** Raise a dues invoice for every active member. */
export async function runAnnualDues(
  periodLabel: string,
  dueDate: string,
): Promise<{ ok: boolean; message: string }> {
  if (!periodLabel.trim()) {
    return { ok: false, message: "Enter a period label." };
  }
  const tenant = await getCurrentTenant();
  const { created } = await generateAnnualDues(
    tenant.id,
    periodLabel.trim(),
    dueDate || null,
  );
  revalidatePath(PATH);
  return {
    ok: true,
    message: `Raised ${created} dues invoice${created === 1 ? "" : "s"}.`,
  };
}

/** Raise a single dues invoice for one member. */
export async function addInvoice(input: {
  membershipId: string;
  periodLabel: string;
  amountDollars: string;
  dueDate: string;
}): Promise<void> {
  if (!input.membershipId || !input.periodLabel.trim()) return;
  const tenant = await getCurrentTenant();
  await generateDuesInvoice({
    tenantId: tenant.id,
    membershipId: input.membershipId,
    periodLabel: input.periodLabel.trim(),
    amountCents: Math.round((Number(input.amountDollars) || 0) * 100),
    dueDate: input.dueDate || null,
  });
  revalidatePath(PATH);
}

/** Record a payment against a dues invoice. */
export async function payInvoice(input: {
  invoiceId: string;
  amountDollars: string;
  method: string;
  paymentDate: string;
}): Promise<{ ok: boolean; message: string }> {
  const tenant = await getCurrentTenant();
  const result = await recordDuesPayment({
    tenantId: tenant.id,
    invoiceId: input.invoiceId,
    amountCents: Math.round((Number(input.amountDollars) || 0) * 100),
    method: input.method,
    paymentDate: input.paymentDate || null,
  });
  revalidatePath(PATH);
  return result;
}

export async function voidInvoice(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await voidDuesInvoice(tenant.id, id);
  revalidatePath(PATH);
}
