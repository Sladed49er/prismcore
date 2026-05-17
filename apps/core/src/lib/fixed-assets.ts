import { desc, eq } from "drizzle-orm";
import { withTenantContext, fixedAssets, type FixedAsset } from "@prismcore/db";

export type { FixedAsset };
export type DepreciationMethod = "straight_line" | "declining_balance";

export interface FixedAssetRow extends FixedAsset {
  accumulatedDepreciationCents: number;
  bookValueCents: number;
}

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Straight-line depreciation: the depreciable base (cost − salvage) is written
 * off evenly over the useful life. Accumulated depreciation is capped at the
 * base, so book value never falls below salvage value.
 */
function depreciate(asset: FixedAsset): {
  accumulated: number;
  book: number;
} {
  const base = Math.max(0, asset.acquisitionCostCents - asset.salvageValueCents);
  const life = Math.max(1, asset.usefulLifeYears);
  let years = 0;
  if (asset.acquiredDate) {
    const elapsed = Date.now() - Date.parse(asset.acquiredDate);
    years = Math.max(0, Math.floor(elapsed / YEAR_MS));
  }
  const accumulated = Math.min(base, Math.round((base / life) * years));
  return {
    accumulated,
    book: asset.acquisitionCostCents - accumulated,
  };
}

export async function listFixedAssets(
  tenantId: string,
): Promise<FixedAssetRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.tenantId, tenantId))
      .orderBy(desc(fixedAssets.createdAt));
    return rows.map((a) => {
      const d = depreciate(a);
      return {
        ...a,
        accumulatedDepreciationCents: d.accumulated,
        bookValueCents: d.book,
      };
    });
  });
}

export async function createFixedAsset(input: {
  tenantId: string;
  name: string;
  category: string;
  acquisitionCostCents: number;
  salvageValueCents: number;
  usefulLifeYears: number;
  method: DepreciationMethod;
  acquiredDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(fixedAssets).values(input);
  });
}

export async function updateFixedAsset(input: {
  tenantId: string;
  id: string;
  name: string;
  category: string;
  acquisitionCostCents: number;
  salvageValueCents: number;
  usefulLifeYears: number;
  method: DepreciationMethod;
  acquiredDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(fixedAssets)
      .set({
        name: input.name,
        category: input.category,
        acquisitionCostCents: input.acquisitionCostCents,
        salvageValueCents: input.salvageValueCents,
        usefulLifeYears: input.usefulLifeYears,
        method: input.method,
        acquiredDate: input.acquiredDate,
        updatedAt: new Date(),
      })
      .where(eq(fixedAssets.id, input.id));
  });
}

export async function deleteFixedAsset(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(fixedAssets).where(eq(fixedAssets.id, id));
  });
}
