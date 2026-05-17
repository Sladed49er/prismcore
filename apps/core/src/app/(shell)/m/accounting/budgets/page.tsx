import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listBudgets, listBudgetLines } from "@/lib/budgets";
import { listAccounts } from "@/lib/gl";
import {
  BudgetsPanel,
  type BudgetDTO,
  type BudgetLineDTO,
  type AccountOption,
} from "@/components/budgets-panel";

export default async function BudgetsPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const [budgetRows, lineRows, accountRows] = await Promise.all([
    listBudgets(config.id),
    listBudgetLines(config.id),
    listAccounts(config.id),
  ]);

  const budgets: BudgetDTO[] = budgetRows.map((b) => ({
    id: b.id,
    name: b.name,
    fiscalYear: b.fiscalYear,
    status: b.status,
    totalCents: b.totalCents,
    lineCount: b.lineCount,
  }));
  const lines: BudgetLineDTO[] = lineRows.map((l) => ({
    id: l.id,
    budgetId: l.budgetId,
    accountName: l.accountName,
    annualAmountCents: l.annualAmountCents,
  }));
  const accounts: AccountOption[] = accountRows
    .filter((a) => a.isActive)
    .map((a) => ({ id: a.id, label: `${a.accountNumber} — ${a.name}` }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Budgets</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Annual budgets by GL account — expand a budget to add or review its
        lines.
      </p>
      <BudgetsPanel budgets={budgets} lines={lines} accounts={accounts} />
    </div>
  );
}
