import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  households,
  householdMembers,
  type Household,
  type HouseholdMember,
} from "@prismcore/db";

/**
 * Households data layer — wealth-management household records and the
 * individual members within each. RLS-scoped through `withTenantContext`.
 */

export type { Household, HouseholdMember };

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

/* ── Household members ────────────────────────────────────────────── */

export interface HouseholdMemberRow extends HouseholdMember {
  householdName: string;
}

/** Every household member for a tenant, with the household's name. */
export async function listHouseholdMembers(
  tenantId: string,
): Promise<HouseholdMemberRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ member: householdMembers, household: households })
      .from(householdMembers)
      .leftJoin(households, eq(householdMembers.householdId, households.id))
      .where(eq(householdMembers.tenantId, tenantId))
      .orderBy(desc(householdMembers.isPrimary));
    return rows.map((r) => ({
      ...r.member,
      householdName: r.household?.name ?? "—",
    }));
  });
}

export async function createHouseholdMember(input: {
  tenantId: string;
  householdId: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  isPrimary: boolean;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(householdMembers).values(input);
  });
}

export async function updateHouseholdMember(input: {
  tenantId: string;
  id: string;
  householdId: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  isPrimary: boolean;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(householdMembers)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(householdMembers.id, id));
  });
}

export async function deleteHouseholdMember(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(householdMembers).where(eq(householdMembers.id, id));
  });
}
