import { desc, eq } from "drizzle-orm";
import { withTenantContext, households, type Household } from "@prismcore/db";

/**
 * Households data layer — wealth-management household records.
 * RLS-scoped through `withTenantContext`.
 */

export type { Household };

export type HouseholdType = "family" | "individual" | "trust" | "business";
export type HouseholdRiskProfile =
  | "conservative"
  | "moderate"
  | "aggressive";
export type HouseholdStatus = "prospect" | "active" | "inactive";

export async function listHouseholds(
  tenantId: string,
): Promise<Household[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(households)
      .where(eq(households.tenantId, tenantId))
      .orderBy(desc(households.aumCents)),
  );
}

export async function createHousehold(input: {
  tenantId: string;
  name: string;
  primaryContactName: string;
  advisorName: string;
  type: HouseholdType;
  aumCents: number;
  riskProfile: HouseholdRiskProfile;
  status: HouseholdStatus;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(households).values(input);
  });
}

export async function updateHousehold(input: {
  tenantId: string;
  id: string;
  name: string;
  primaryContactName: string;
  advisorName: string;
  type: HouseholdType;
  aumCents: number;
  riskProfile: HouseholdRiskProfile;
  status: HouseholdStatus;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(households)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(households.id, id));
  });
}

export async function setHouseholdStatus(input: {
  tenantId: string;
  id: string;
  status: HouseholdStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(households)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(households.id, input.id));
  });
}

export async function deleteHousehold(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(households).where(eq(households.id, id));
  });
}
