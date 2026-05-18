import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  specialtyMarkets,
  type SpecialtyMarket,
} from "@prismcore/db";

/**
 * Specialty markets data layer — the agency's niche-carrier / MGA repository.
 * RLS-scoped through `withTenantContext`. The AI market-match lives in
 * `specialty-markets-assistant.ts`.
 */

export type { SpecialtyMarket };

export type SpecialtyMarketType =
  | "mga"
  | "wholesaler"
  | "surplus_carrier"
  | "program"
  | "other";

export async function listSpecialtyMarkets(
  tenantId: string,
): Promise<SpecialtyMarket[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(specialtyMarkets)
      .where(eq(specialtyMarkets.tenantId, tenantId))
      .orderBy(desc(specialtyMarkets.createdAt)),
  );
}

export async function createSpecialtyMarket(input: {
  tenantId: string;
  name: string;
  marketType: SpecialtyMarketType;
  appetite: string;
  linesOfBusiness: string;
  states: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(specialtyMarkets).values(input);
  });
}

export async function updateSpecialtyMarket(input: {
  tenantId: string;
  id: string;
  name: string;
  marketType: SpecialtyMarketType;
  appetite: string;
  linesOfBusiness: string;
  states: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(specialtyMarkets)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(specialtyMarkets.id, id));
  });
}

export async function setSpecialtyMarketActive(input: {
  tenantId: string;
  id: string;
  isActive: boolean;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(specialtyMarkets)
      .set({ isActive: input.isActive, updatedAt: new Date() })
      .where(eq(specialtyMarkets.id, input.id));
  });
}

export async function deleteSpecialtyMarket(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(specialtyMarkets).where(eq(specialtyMarkets.id, id));
  });
}
