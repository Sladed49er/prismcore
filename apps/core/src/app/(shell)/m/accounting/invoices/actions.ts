"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createInvoice,
  setInvoiceStatus,
  type InvoiceStatus,
} from "@/lib/accounting";

export async function addInvoice(input: {
  clientId: string;
  invoiceNumber: string;
  description: string;
  amountDollars: string;
  status: InvoiceStatus;
  dueDate: string;
}): Promise<void> {
  if (!input.clientId || !input.invoiceNumber.trim()) return;
  const tenant = await getCurrentTenant();
  await createInvoice({
    tenantId: tenant.id,
    clientId: input.clientId,
    invoiceNumber: input.invoiceNumber.trim(),
    description: input.description.trim(),
    amountCents: Math.round(
      (Number.parseFloat(input.amountDollars) || 0) * 100,
    ),
    status: input.status,
    dueDate: input.dueDate || null,
  });
  revalidatePath("/m/accounting/invoices");
}

export async function advanceInvoice(
  invoiceId: string,
  status: InvoiceStatus,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setInvoiceStatus(tenant.id, invoiceId, status);
  revalidatePath("/m/accounting/invoices");
}
