import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listPayRuns, listPayRunEntries, listEmployees } from "@/lib/payroll";
import {
  PayrollPanel,
  type PayRunDTO,
  type PayRunEntryDTO,
} from "@/components/payroll-panel";

export default async function PayrollPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const [runRows, entryRows, employees] = await Promise.all([
    listPayRuns(config.id),
    listPayRunEntries(config.id),
    listEmployees(config.id),
  ]);

  const runs: PayRunDTO[] = runRows.map((r) => ({
    id: r.id,
    label: r.label,
    payDate: r.payDate,
    status: r.status,
    totalGrossCents: r.totalGrossCents,
    totalNetCents: r.totalNetCents,
    entryCount: r.entryCount,
  }));
  const entries: PayRunEntryDTO[] = entryRows.map((e) => ({
    id: e.id,
    payRunId: e.payRunId,
    employeeName: e.employeeName,
    grossCents: e.grossCents,
    taxCents: e.taxCents,
    netCents: e.netCents,
  }));
  const activeCount = employees.filter((e) => e.isActive).length;

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Payroll</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Pay runs — each generates a gross / tax / net entry for every active
        employee, then posts.
      </p>
      <PayrollPanel
        runs={runs}
        entries={entries}
        employeeCount={activeCount}
      />
    </div>
  );
}
