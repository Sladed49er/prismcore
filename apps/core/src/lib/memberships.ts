import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  memberships,
  membershipPayments,
  type Membership,
  type MembershipPayment,
} from "@prismcore/db";

/**
 * Memberships data layer — the association member directory and each
 * member's dues-payment history. RLS-scoped through `withTenantContext`.
 */

export type { Membership, MembershipPayment };

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

/* ── Dues payments ────────────────────────────────────────────────── */

export interface MembershipPaymentRow extends MembershipPayment {
  memberName: string;
}

export async function listMembershipPayments(
  tenantId: string,
): Promise<MembershipPaymentRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ payment: membershipPayments, member: memberships })
      .from(membershipPayments)
      .leftJoin(
        memberships,
        eq(membershipPayments.membershipId, memberships.id),
      )
      .where(eq(membershipPayments.tenantId, tenantId))
      .orderBy(desc(membershipPayments.paymentDate));
    return rows.map((r) => ({
      ...r.payment,
      memberName: r.member?.memberName ?? "—",
    }));
  });
}

export async function createMembershipPayment(input: {
  tenantId: string;
  membershipId: string;
  amountCents: number;
  paymentDate: string | null;
  method: string;
  period: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(membershipPayments).values(input);
  });
}

export async function deleteMembershipPayment(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(membershipPayments)
      .where(eq(membershipPayments.id, id));
  });
}
