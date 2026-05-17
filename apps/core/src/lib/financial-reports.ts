/**
 * Financial reports — Profit & Loss, Balance Sheet, and Trial Balance, all
 * computed from posted journal entries. No own tables.
 *
 * Normal balances: assets and expenses are debit-normal; liabilities, equity,
 * and revenue are credit-normal. The P&L covers activity within the reporting
 * year; the Balance Sheet and Trial Balance are cumulative through year-end.
 * Current-year net income rolls into equity so the Balance Sheet balances.
 */
import { eq } from "drizzle-orm";
import {
  withTenantContext,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "@prismcore/db";

export interface ReportLine {
  accountNumber: string;
  name: string;
  amountCents: number;
}

export interface TrialBalanceRow {
  accountNumber: string;
  name: string;
  debitCents: number;
  creditCents: number;
}

export interface FinancialReport {
  year: string;
  revenue: ReportLine[];
  expenses: ReportLine[];
  totalRevenueCents: number;
  totalExpenseCents: number;
  netIncomeCents: number;
  assets: ReportLine[];
  liabilities: ReportLine[];
  equity: ReportLine[];
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  totalEquityCents: number;
  trialBalance: TrialBalanceRow[];
  trialDebitCents: number;
  trialCreditCents: number;
}

export async function financialReport(
  tenantId: string,
  year: string,
): Promise<FinancialReport> {
  return withTenantContext(tenantId, async (tx) => {
    const accounts = await tx
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, tenantId));
    const entries = await tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, tenantId));
    const lines = await tx
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.tenantId, tenantId));

    // Posted entries only; null entry dates count toward cumulative totals.
    const entryYear = new Map<string, string | null>();
    for (const e of entries) {
      if (e.status !== "posted") continue;
      entryYear.set(e.id, e.entryDate ? e.entryDate.slice(0, 4) : null);
    }

    type Agg = { pd: number; pc: number; cd: number; cc: number };
    const agg = new Map<string, Agg>();
    for (const l of lines) {
      if (!entryYear.has(l.journalEntryId)) continue;
      const ey = entryYear.get(l.journalEntryId) ?? null;
      const a = agg.get(l.accountId) ?? { pd: 0, pc: 0, cd: 0, cc: 0 };
      if (ey === year) {
        a.pd += l.debitCents;
        a.pc += l.creditCents;
      }
      if (ey === null || ey <= year) {
        a.cd += l.debitCents;
        a.cc += l.creditCents;
      }
      agg.set(l.accountId, a);
    }

    const revenue: ReportLine[] = [];
    const expenses: ReportLine[] = [];
    const assets: ReportLine[] = [];
    const liabilities: ReportLine[] = [];
    const equity: ReportLine[] = [];
    const trialBalance: TrialBalanceRow[] = [];

    const sorted = [...accounts].sort((a, b) =>
      a.accountNumber.localeCompare(b.accountNumber),
    );
    for (const acct of sorted) {
      const a = agg.get(acct.id);
      if (!a) continue;
      if (a.cd !== 0 || a.cc !== 0) {
        trialBalance.push({
          accountNumber: acct.accountNumber,
          name: acct.name,
          debitCents: a.cd,
          creditCents: a.cc,
        });
      }
      const line = (amt: number): ReportLine => ({
        accountNumber: acct.accountNumber,
        name: acct.name,
        amountCents: amt,
      });
      if (acct.type === "revenue") {
        const amt = a.pc - a.pd;
        if (amt !== 0) revenue.push(line(amt));
      } else if (acct.type === "expense") {
        const amt = a.pd - a.pc;
        if (amt !== 0) expenses.push(line(amt));
      } else if (acct.type === "asset") {
        const amt = a.cd - a.cc;
        if (amt !== 0) assets.push(line(amt));
      } else if (acct.type === "liability") {
        const amt = a.cc - a.cd;
        if (amt !== 0) liabilities.push(line(amt));
      } else if (acct.type === "equity") {
        const amt = a.cc - a.cd;
        if (amt !== 0) equity.push(line(amt));
      }
    }

    const sum = (rows: ReportLine[]): number =>
      rows.reduce((s, r) => s + r.amountCents, 0);
    const totalRevenueCents = sum(revenue);
    const totalExpenseCents = sum(expenses);
    const netIncomeCents = totalRevenueCents - totalExpenseCents;

    // Current-year net income rolls into equity to balance the sheet.
    equity.push({
      accountNumber: "—",
      name: `Net income — ${year}`,
      amountCents: netIncomeCents,
    });

    return {
      year,
      revenue,
      expenses,
      totalRevenueCents,
      totalExpenseCents,
      netIncomeCents,
      assets,
      liabilities,
      equity,
      totalAssetsCents: sum(assets),
      totalLiabilitiesCents: sum(liabilities),
      totalEquityCents: sum(equity),
      trialBalance,
      trialDebitCents: trialBalance.reduce((s, r) => s + r.debitCents, 0),
      trialCreditCents: trialBalance.reduce((s, r) => s + r.creditCents, 0),
    };
  });
}
