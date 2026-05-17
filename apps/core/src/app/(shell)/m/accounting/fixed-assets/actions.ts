"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createFixedAsset, type DepreciationMethod } from "@/lib/fixed-assets";

export async function addAsset(input: {
  name: string;
  category: string;
  costDollars: string;
  salvageDollars: string;
  usefulLifeYears: string;
  method: DepreciationMethod;
  acquiredDate: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createFixedAsset({
    tenantId: tenant.id,
    name: input.name.trim(),
    category: input.category.trim(),
    acquisitionCostCents: Math.round(
      (Number.parseFloat(input.costDollars) || 0) * 100,
    ),
    salvageValueCents: Math.round(
      (Number.parseFloat(input.salvageDollars) || 0) * 100,
    ),
    usefulLifeYears: Math.max(
      1,
      Number.parseInt(input.usefulLifeYears, 10) || 5,
    ),
    method: input.method,
    acquiredDate: input.acquiredDate || null,
  });
  revalidatePath("/m/accounting/fixed-assets");
}
