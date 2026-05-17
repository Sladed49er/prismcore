"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createBudget,
  addBudgetLine,
  updateBudget,
  deleteBudget,
  deleteBudgetLine,
  type BudgetStatus,
} from "@/lib/budgets";

export async function newBudget(input: {
  name: string;
  fiscalYear: string;
  status: BudgetStatus;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createBudget({
    tenantId: tenant.id,
    name: input.name.trim(),
    fiscalYear: input.fiscalYear.trim(),
    status: input.status,
  });
  revalidatePath("/m/accounting/budgets");
}

export async function editBudget(input: {
  id: string;
  name: string;
  fiscalYear: string;
  status: BudgetStatus;
}): Promise<void> {
  if (!input.id || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateBudget({
    tenantId: tenant.id,
    id: input.id,
    name: input.name.trim(),
    fiscalYear: input.fiscalYear.trim(),
    status: input.status,
  });
  revalidatePath("/m/accounting/budgets");
}

export async function removeBudget(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deleteBudget(tenant.id, id);
  revalidatePath("/m/accounting/budgets");
}

export async function removeBudgetLine(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deleteBudgetLine(tenant.id, id);
  revalidatePath("/m/accounting/budgets");
}

export async function addLine(input: {
  budgetId: string;
  accountId: string;
  amountDollars: string;
}): Promise<void> {
  if (!input.budgetId || !input.accountId) return;
  const tenant = await getCurrentTenant();
  await addBudgetLine({
    tenantId: tenant.id,
    budgetId: input.budgetId,
    accountId: input.accountId,
    annualAmountCents: Math.round(
      (Number.parseFloat(input.amountDollars) || 0) * 100,
    ),
  });
  revalidatePath("/m/accounting/budgets");
}
