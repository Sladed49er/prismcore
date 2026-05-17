import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listQuarterlyTaxes } from "@/lib/quarterly-taxes";
import {
  QuarterlyTaxesPanel,
  type QuarterlyTaxDTO,
} from "@/components/quarterly-taxes-panel";

export default async function QuarterlyTaxesPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listQuarterlyTaxes(config.id);

  const payments: QuarterlyTaxDTO[] = rows.map((r) => ({
    id: r.id,
    taxType: r.taxType,
    year: r.year,
    quarter: r.quarter,
    estimatedCents: r.estimatedCents,
    paidCents: r.paidCents,
    dueDate: r.dueDate,
    status: r.status,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Quarterly Taxes</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Schedule estimated quarterly tax payments and mark them paid as the
        deadlines pass.
      </p>
      <QuarterlyTaxesPanel rows={payments} />
    </div>
  );
}
