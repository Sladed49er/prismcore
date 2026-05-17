import Link from "next/link";
import { requireModule } from "@/lib/kernel";

/** Sub-modules that are built and live. */
const BUILT = [
  {
    href: "/m/accounting/chart-of-accounts",
    name: "Chart of Accounts",
    desc: "The GL account master — assets, liabilities, equity, revenue, expense.",
  },
  {
    href: "/m/accounting/journal-entries",
    name: "Journal Entries",
    desc: "Double-entry GL postings; debits balance credits.",
  },
  {
    href: "/m/accounting/invoices",
    name: "Invoices",
    desc: "Client billing and accounts receivable.",
  },
  {
    href: "/m/accounting/vendors",
    name: "Vendors",
    desc: "The accounts-payable master — carriers, suppliers, services.",
  },
  {
    href: "/m/accounting/bills",
    name: "Bills",
    desc: "Vendor bills and payables, paid down to zero.",
  },
  {
    href: "/m/accounting/trust",
    name: "Trust Accounting",
    desc: "The fiduciary premium trust ledger with a running balance.",
  },
  {
    href: "/m/accounting/employees",
    name: "Employees",
    desc: "The payroll employee master — W-2 staff and 1099 contractors.",
  },
  {
    href: "/m/accounting/payroll",
    name: "Payroll",
    desc: "Pay runs — gross, tax, and net per employee.",
  },
  {
    href: "/m/accounting/bank-reconciliation",
    name: "Bank Reconciliation",
    desc: "Reconcile each statement against the books.",
  },
  {
    href: "/m/accounting/budgets",
    name: "Budgets",
    desc: "Annual budgets by GL account.",
  },
  {
    href: "/m/accounting/fixed-assets",
    name: "Fixed Assets",
    desc: "Depreciable assets with computed book value.",
  },
  {
    href: "/m/accounting/estimates",
    name: "Estimates",
    desc: "Client quotes and estimates.",
  },
  {
    href: "/m/accounting/checks",
    name: "Checks & Positive Pay",
    desc: "The check register, tracked through clearing.",
  },
  {
    href: "/m/accounting/fiscal-periods",
    name: "Fiscal Periods",
    desc: "Accounting periods, opened and closed.",
  },
  {
    href: "/m/accounting/surplus-lines",
    name: "Surplus Lines Tax",
    desc: "Per-state surplus-lines premium tax and fees.",
  },
  {
    href: "/m/accounting/quarterly-taxes",
    name: "Quarterly Taxes",
    desc: "Estimated quarterly tax payment schedule.",
  },
];

/** The remaining accounting sub-modules, ported in over the coming turns. */
const PLANNED = ["1099 / W-2 Reporting", "Financial Reports"];

export default async function AccountingHub() {
  await requireModule("accounting");

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Accounting
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Accounting</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The agency&rsquo;s financial back office — general ledger, receivables,
        payables, trust accounting, and payroll.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {BUILT.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300"
          >
            <h3 className="font-semibold">{s.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Coming next in the accounting build-out
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {PLANNED.map((p) => (
          <span
            key={p}
            className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-400"
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
