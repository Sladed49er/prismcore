import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listFixedAssets } from "@/lib/fixed-assets";
import {
  FixedAssetsPanel,
  type FixedAssetDTO,
} from "@/components/fixed-assets-panel";

export default async function FixedAssetsPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listFixedAssets(config.id);

  const assets: FixedAssetDTO[] = rows.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    acquisitionCostCents: a.acquisitionCostCents,
    accumulatedDepreciationCents: a.accumulatedDepreciationCents,
    bookValueCents: a.bookValueCents,
    method: a.method,
    acquiredDate: a.acquiredDate,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Fixed Assets</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Depreciable assets — accumulated depreciation and net book value are
        computed from cost, salvage value, and useful life.
      </p>
      <FixedAssetsPanel assets={assets} />
    </div>
  );
}
