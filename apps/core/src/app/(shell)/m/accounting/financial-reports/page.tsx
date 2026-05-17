import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import {
  financialReport,
  type ReportLine,
} from "@/lib/financial-reports";

function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return sign + "$" + (Math.abs(cents) / 100).toLocaleString();
}

/** A labelled group of report lines with a subtotal row. */
function LineGroup({
  label,
  rows,
  total,
}: {
  label: string;
  rows: ReportLine[];
  total: number;
}) {
  return (
    <>
      <tr className="bg-gray-50">
        <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </td>
      </tr>
      {rows.length === 0 ? (
        <tr>
          <td colSpan={2} className="px-4 py-2 text-sm text-gray-400">
            None
          </td>
        </tr>
      ) : (
        rows.map((r, i) => (
          <tr key={`${label}-${r.accountNumber}-${i}`}>
            <td className="px-4 py-2 text-sm">
              <span className="text-gray-400">{r.accountNumber}</span>{" "}
              {r.name}
            </td>
            <td className="px-4 py-2 text-right text-sm tabular-nums">
              {money(r.amountCents)}
            </td>
          </tr>
        ))
      )}
      <tr className="border-t border-gray-200">
        <td className="px-4 py-2 text-sm font-semibold">Total {label}</td>
        <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums">
          {money(total)}
        </td>
      </tr>
    </>
  );
}

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();

  const now = new Date().getFullYear();
  const years = [now, now - 1, now - 2].map(String);
  const { year: rawYear } = await searchParams;
  const year = rawYear && years.includes(rawYear) ? rawYear : String(now);

  const r = await financialReport(config.id, year);
  const balanceCheck = r.totalAssetsCents - (r.totalLiabilitiesCents + r.totalEquityCents);

  const cardClass =
    "mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white";

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Financial Reports</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Profit &amp; Loss, Balance Sheet, and Trial Balance — all computed live
        from posted journal entries.
      </p>

      <div className="mt-5 flex gap-2">
        {years.map((y) => (
          <Link
            key={y}
            href={`/m/accounting/financial-reports?year=${y}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              y === year
                ? "bg-indigo-600 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      <h2 className="mt-7 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Profit &amp; Loss — {year}
      </h2>
      <div className={cardClass}>
        <table className="w-full">
          <tbody>
            <LineGroup
              label="Revenue"
              rows={r.revenue}
              total={r.totalRevenueCents}
            />
            <LineGroup
              label="Expenses"
              rows={r.expenses}
              total={r.totalExpenseCents}
            />
            <tr className="border-t-2 border-gray-300 bg-indigo-50">
              <td className="px-4 py-3 text-sm font-bold">Net income</td>
              <td className="px-4 py-3 text-right text-sm font-bold tabular-nums">
                {money(r.netIncomeCents)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Balance Sheet — as of {year} year-end
      </h2>
      <div className={cardClass}>
        <table className="w-full">
          <tbody>
            <LineGroup
              label="Assets"
              rows={r.assets}
              total={r.totalAssetsCents}
            />
            <LineGroup
              label="Liabilities"
              rows={r.liabilities}
              total={r.totalLiabilitiesCents}
            />
            <LineGroup
              label="Equity"
              rows={r.equity}
              total={r.totalEquityCents}
            />
            <tr className="border-t-2 border-gray-300 bg-indigo-50">
              <td className="px-4 py-3 text-sm font-bold">
                Liabilities + Equity
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold tabular-nums">
                {money(r.totalLiabilitiesCents + r.totalEquityCents)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p
        className={`mt-2 text-xs ${
          balanceCheck === 0 ? "text-emerald-600" : "text-amber-600"
        }`}
      >
        {balanceCheck === 0
          ? "✓ Balanced — assets equal liabilities plus equity."
          : `⚠ Out of balance by ${money(balanceCheck)} — check for unposted or draft entries.`}
      </p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Trial Balance — through {year} year-end
      </h2>
      <div className={cardClass}>
        {r.trialBalance.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No posted journal activity yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Account</th>
                <th className="px-4 py-3 text-right font-semibold">Debit</th>
                <th className="px-4 py-3 text-right font-semibold">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.trialBalance.map((row) => (
                <tr key={row.accountNumber}>
                  <td className="px-4 py-2">
                    <span className="text-gray-400">{row.accountNumber}</span>{" "}
                    {row.name}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.debitCents ? money(row.debitCents) : ""}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.creditCents ? money(row.creditCents) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-3">Totals</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {money(r.trialDebitCents)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {money(r.trialCreditCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
