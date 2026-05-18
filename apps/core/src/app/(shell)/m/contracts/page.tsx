import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listContracts } from "@/lib/contracts";
import { ContractsPanel, type ContractDTO } from "@/components/contracts-panel";

/**
 * Contracts module — the agency's vendor agreements (software, services,
 * leases) with renewal dates, notice periods, and an expiring-soon view.
 */
export default async function ContractsPage() {
  await requireModule("contracts");
  const { config } = await loadCurrentTenant();
  const rows = await listContracts(config.id);

  const contracts: ContractDTO[] = rows.map((c) => ({
    id: c.id,
    vendorName: c.vendorName,
    title: c.title,
    category: c.category,
    status: c.status,
    startDate: c.startDate,
    endDate: c.endDate,
    annualValueCents: c.annualValueCents,
    autoRenew: c.autoRenew,
    noticePeriodDays: c.noticePeriodDays,
    ownerName: c.ownerName,
    notes: c.notes,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Contracts</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Track the agency&rsquo;s vendor agreements — renewal dates, notice
        periods, and annual spend — so nothing auto-renews unnoticed.
      </p>
      <ContractsPanel contracts={contracts} />
    </div>
  );
}
