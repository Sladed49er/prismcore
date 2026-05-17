import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listPeriods } from "@/lib/periods";
import {
  FiscalPeriodsPanel,
  type PeriodDTO,
} from "@/components/fiscal-periods-panel";

export default async function FiscalPeriodsPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listPeriods(config.id);

  const periods: PeriodDTO[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Fiscal Periods</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Define accounting periods and close them once reconciled — closed
        periods lock their books against further posting.
      </p>
      <FiscalPeriodsPanel periods={periods} />
    </div>
  );
}
