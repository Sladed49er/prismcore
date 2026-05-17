import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listUnderwritingGuidelines } from "@/lib/underwriting-guidelines";
import { listCarriers } from "@/lib/carriers";
import {
  UnderwritingGuidelinesPanel,
  type UnderwritingGuidelineDTO,
  type CarrierOption,
} from "@/components/underwriting-guidelines-panel";

export default async function UnderwritingGuidelinesPage() {
  await requireModule("carriers");
  const { config } = await loadCurrentTenant();
  const [guideRows, carrierRows] = await Promise.all([
    listUnderwritingGuidelines(config.id),
    listCarriers(config.id),
  ]);

  const guidelines: UnderwritingGuidelineDTO[] = guideRows.map((g) => ({
    id: g.id,
    carrierName: g.carrierName,
    lineOfBusiness: g.lineOfBusiness,
    title: g.title,
    guidelines: g.guidelines,
    status: g.status,
  }));
  const carriers: CarrierOption[] = carrierRows.map((c) => ({
    id: c.id,
    label: c.name,
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/m/carriers"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Carriers
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Underwriting Guidelines</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Each carrier&rsquo;s appetite and underwriting rules by line of
        business — kept current so quoting stays on target.
      </p>
      <UnderwritingGuidelinesPanel
        guidelines={guidelines}
        carriers={carriers}
      />
    </div>
  );
}
