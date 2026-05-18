import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listSpecialtyMarkets } from "@/lib/specialty-markets";
import {
  SpecialtyMarketsPanel,
  type SpecialtyMarketDTO,
} from "@/components/specialty-markets-panel";

/**
 * Specialty Markets module — the agency's niche-carrier / MGA repository,
 * with an AI matcher that ranks markets by fit for a described risk.
 */
export default async function SpecialtyMarketsPage() {
  await requireModule("specialty_markets");
  const { config } = await loadCurrentTenant();
  const rows = await listSpecialtyMarkets(config.id);

  const markets: SpecialtyMarketDTO[] = rows.map((m) => ({
    id: m.id,
    name: m.name,
    marketType: m.marketType,
    appetite: m.appetite,
    linesOfBusiness: m.linesOfBusiness,
    states: m.states,
    contactName: m.contactName,
    contactEmail: m.contactEmail,
    contactPhone: m.contactPhone,
    website: m.website,
    notes: m.notes,
    isActive: m.isActive,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Specialty Markets</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Your repository of niche carriers, MGAs, wholesalers, and programs for
        placing hard-to-write risks — searchable by an AI matcher.
      </p>
      <SpecialtyMarketsPanel markets={markets} />
    </div>
  );
}
