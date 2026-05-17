"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createQuarterlyTax,
  markQuarterlyTaxPaid,
  updateQuarterlyTax,
  deleteQuarterlyTax,
} from "@/lib/quarterly-taxes";

export async function newQuarterlyTax(input: {
  taxType: string;
  year: string;
  quarter: string;
  estimatedDollars: string;
  dueDate: string;
}): Promise<void> {
  if (!input.taxType.trim()) return;
  const tenant = await getCurrentTenant();
  await createQuarterlyTax({
    tenantId: tenant.id,
    taxType: input.taxType.trim(),
    year: input.year.trim(),
    quarter: input.quarter,
    estimatedCents: Math.round(
      (Number.parseFloat(input.estimatedDollars) || 0) * 100,
    ),
    dueDate: input.dueDate || null,
  });
  revalidatePath("/m/accounting/quarterly-taxes");
}

export async function editQuarterlyTax(input: {
  id: string;
  taxType: string;
  year: string;
  quarter: string;
  estimatedDollars: string;
  dueDate: string;
}): Promise<void> {
  if (!input.id || !input.taxType.trim()) return;
  const tenant = await getCurrentTenant();
  await updateQuarterlyTax({
    tenantId: tenant.id,
    id: input.id,
    taxType: input.taxType.trim(),
    year: input.year.trim(),
    quarter: input.quarter,
    estimatedCents: Math.round(
      (Number.parseFloat(input.estimatedDollars) || 0) * 100,
    ),
    dueDate: input.dueDate || null,
  });
  revalidatePath("/m/accounting/quarterly-taxes");
}

export async function removeQuarterlyTax(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deleteQuarterlyTax(tenant.id, id);
  revalidatePath("/m/accounting/quarterly-taxes");
}

export async function payQuarterlyTax(input: {
  id: string;
  paidDollars: string;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await markQuarterlyTaxPaid({
    tenantId: tenant.id,
    id: input.id,
    paidCents: Math.round((Number.parseFloat(input.paidDollars) || 0) * 100),
  });
  revalidatePath("/m/accounting/quarterly-taxes");
}
