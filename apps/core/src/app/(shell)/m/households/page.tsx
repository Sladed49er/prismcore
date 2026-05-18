import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listHouseholds } from "@/lib/households";
import {
  HouseholdsPanel,
  type HouseholdDTO,
} from "@/components/households-panel";

/**
 * Households module — the wealth-management household: the family or entity
 * unit a financial practice advises, with assets under management and risk.
 */
export default async function HouseholdsPage() {
  await requireModule("households");
  const { config } = await loadCurrentTenant();
  const rows = await listHouseholds(config.id);

  const households: HouseholdDTO[] = rows.map((h) => ({
    id: h.id,
    name: h.name,
    primaryContactName: h.primaryContactName,
    advisorName: h.advisorName,
    type: h.type,
    aumCents: h.aumCents,
    riskProfile: h.riskProfile,
    status: h.status,
    notes: h.notes,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Wealth
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Households</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The household is the unit of wealth management — a family, individual,
        trust, or business, with its advisor, assets, and risk profile.
      </p>
      <HouseholdsPanel households={households} />
    </div>
  );
}
