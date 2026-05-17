import { asc, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  budgets,
  budgetLines,
  chartOfAccounts,
  type Budget,
} from "@prismcore/db";

export type { Budget };
export type BudgetStatus = "draft" | "active" | "archived";

export interface BudgetRow extends Budget {
  totalCents: number;
  lineCount: number;
}

export interface BudgetLineRow {
  id: string;
  budgetId: string;
  accountName: string;
  annualAmountCents: number;
}

export async function listBudgets(tenantId: string): Promise<BudgetRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(budgets)
      .where(eq(budgets.tenantId, tenantId))
      .orderBy(desc(budgets.createdAt));
    const lines = await tx
      .select()
      .from(budgetLines)
      .where(eq(budgetLines.tenantId, tenantId));
    const byBudget = new Map<string, { total: number; n: number }>();
    for (const l of lines) {
      const acc = byBudget.get(l.budgetId) ?? { total: 0, n: 0 };
      acc.total += l.annualAmountCents;
      acc.n += 1;
      byBudget.set(l.budgetId, acc);
    }
    return rows.map((b) => ({
      ...b,
      totalCents: byBudget.get(b.id)?.total ?? 0,
      lineCount: byBudget.get(b.id)?.n ?? 0,
    }));
  });
}

export async function listBudgetLines(
  tenantId: string,
): Promise<BudgetLineRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ line: budgetLines, account: chartOfAccounts })
      .from(budgetLines)
      .leftJoin(chartOfAccounts, eq(budgetLines.accountId, chartOfAccounts.id))
      .where(eq(budgetLines.tenantId, tenantId))
      .orderBy(asc(chartOfAccounts.accountNumber));
    return rows.map((r) => ({
      id: r.line.id,
      budgetId: r.line.budgetId,
      accountName: r.account
        ? `${r.account.accountNumber} — ${r.account.name}`
        : "—",
      annualAmountCents: r.line.annualAmountCents,
    }));
  });
}

export async function createBudget(input: {
  tenantId: string;
  name: string;
  fiscalYear: string;
  status: BudgetStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(budgets).values(input);
  });
}

export async function addBudgetLine(input: {
  tenantId: string;
  budgetId: string;
  accountId: string;
  annualAmountCents: number;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(budgetLines).values(input);
  });
}
