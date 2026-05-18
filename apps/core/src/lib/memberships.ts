import { desc, eq } from "drizzle-orm";
import { withTenantContext, memberships, type Membership } from "@prismcore/db";

/**
 * Memberships data layer — the association member directory.
 * RLS-scoped through `withTenantContext`.
 */

export type { Membership };

export type MembershipTier =
  | "individual"
  | "professional"
  | "corporate"
  | "student"
  | "lifetime";

export type MembershipStatus = "active" | "pending" | "lapsed" | "cancelled";

export async function listMemberships(
  tenantId: string,
): Promise<Membership[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId))
      .orderBy(desc(memberships.renewalDate)),
  );
}

export async function createMembership(input: {
  tenantId: string;
  memberName: string;
  organization: string;
  tier: MembershipTier;
  status: MembershipStatus;
  joinDate: string | null;
  renewalDate: string | null;
  duesCents: number;
  email: string;
  phone: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(memberships).values(input);
  });
}

export async function updateMembership(input: {
  tenantId: string;
  id: string;
  memberName: string;
  organization: string;
  tier: MembershipTier;
  status: MembershipStatus;
  joinDate: string | null;
  renewalDate: string | null;
  duesCents: number;
  email: string;
  phone: string;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(memberships)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(memberships.id, id));
  });
}

export async function setMembershipStatus(input: {
  tenantId: string;
  id: string;
  status: MembershipStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(memberships)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(memberships.id, input.id));
  });
}

export async function deleteMembership(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(memberships).where(eq(memberships.id, id));
  });
}
