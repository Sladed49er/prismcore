import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listTaxEngagements } from "@/lib/tax-practice";
import {
  TaxPracticePanel,
  type TaxEngagementDTO,
} from "@/components/tax-practice-panel";

/**
 * Tax Practice module — tax-preparation engagements: one row per return the
 * practice is engaged to prepare, tracked from not-started through filed.
 */
export default async function TaxPracticePage() {
  await requireModule("tax_practice");
  const { config } = await loadCurrentTenant();
  const rows = await listTaxEngagements(config.id);

  const engagements: TaxEngagementDTO[] = rows.map((e) => ({
    id: e.id,
    clientName: e.clientName,
    taxYear: e.taxYear,
    engagementType: e.engagementType,
    status: e.status,
    dueDate: e.dueDate,
    feeCents: e.feeCents,
    preparerName: e.preparerName,
    notes: e.notes,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Wealth
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Tax Practice</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Tax-preparation engagements — each return tracked by client, tax year,
        and type, from not-started through filed, with fees and due dates.
      </p>
      <TaxPracticePanel engagements={engagements} />
    </div>
  );
}
