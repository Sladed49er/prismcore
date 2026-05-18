import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  adminDb,
  memberPortalInvitations,
  memberships,
  memberBenefits,
  associationEvents,
  tenants,
  type MemberPortalInvitation,
} from "@prismcore/db";

/**
 * Member portal data layer.
 *
 * Mirrors the client portal: the association manages access tokens
 * (tenant-scoped through `withTenantContext`), and the public portal view is
 * resolved by token through `adminDb` — there is no user session, so the
 * token maps to its tenant, then all data is read back inside
 * `withTenantContext` so RLS still scopes every query.
 */

export type MemberPortalStatus = "invited" | "active" | "revoked";

export interface MemberPortalInvitationRow extends MemberPortalInvitation {
  /** Whether the linked membership still exists. */
  membershipExists: boolean;
}

export async function listMemberPortalInvitations(
  tenantId: string,
): Promise<MemberPortalInvitationRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        invitation: memberPortalInvitations,
        membershipId: memberships.id,
      })
      .from(memberPortalInvitations)
      .leftJoin(
        memberships,
        eq(memberPortalInvitations.membershipId, memberships.id),
      )
      .where(eq(memberPortalInvitations.tenantId, tenantId))
      .orderBy(desc(memberPortalInvitations.createdAt));
    return rows.map((r) => ({
      ...r.invitation,
      membershipExists: r.membershipId !== null,
    }));
  });
}

/** Create (or reuse) a portal access token for a member. */
export async function createMemberPortalInvitation(input: {
  tenantId: string;
  membershipId: string;
  memberName: string;
  email: string;
}): Promise<string> {
  return withTenantContext(input.tenantId, async (tx) => {
    const existing = await tx
      .select()
      .from(memberPortalInvitations)
      .where(
        and(
          eq(memberPortalInvitations.tenantId, input.tenantId),
          eq(memberPortalInvitations.membershipId, input.membershipId),
        ),
      );
    const reusable = existing.find((i) => i.status !== "revoked");
    if (reusable) return reusable.token;

    const token = randomBytes(24).toString("hex");
    await tx.insert(memberPortalInvitations).values({
      tenantId: input.tenantId,
      membershipId: input.membershipId,
      memberName: input.memberName,
      token,
      email: input.email,
      status: "invited",
    });
    return token;
  });
}

export async function revokeMemberPortalInvitation(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(memberPortalInvitations)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(eq(memberPortalInvitations.id, id));
  });
}

export async function deleteMemberPortalInvitation(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(memberPortalInvitations)
      .where(eq(memberPortalInvitations.id, id));
  });
}

/** What a member sees on the public portal — read-only. */
export interface MemberPortalView {
  associationName: string;
  memberName: string;
  membership: {
    tier: string;
    status: string;
    renewalDate: string | null;
    duesCents: number;
  };
  benefits: {
    id: string;
    name: string;
    partnerName: string;
    category: string;
    description: string;
    redemptionDetails: string;
    url: string;
  }[];
  events: {
    id: string;
    name: string;
    type: string;
    startDate: string | null;
    location: string;
    feeCents: number;
  }[];
}

/** Resolve a portal token to the member's read-only view, or null. */
export async function getMemberPortalView(
  token: string,
): Promise<MemberPortalView | null> {
  if (!token) return null;

  const [invitation] = await adminDb()
    .select()
    .from(memberPortalInvitations)
    .where(eq(memberPortalInvitations.token, token));
  if (!invitation || invitation.status === "revoked") return null;

  const [tenant] = await adminDb()
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, invitation.tenantId));

  return withTenantContext(invitation.tenantId, async (tx) => {
    const [membership] = await tx
      .select()
      .from(memberships)
      .where(eq(memberships.id, invitation.membershipId));
    if (!membership) return null;

    const benefitRows = await tx
      .select()
      .from(memberBenefits)
      .where(eq(memberBenefits.tenantId, invitation.tenantId))
      .orderBy(desc(memberBenefits.createdAt));

    const eventRows = await tx
      .select()
      .from(associationEvents)
      .where(eq(associationEvents.tenantId, invitation.tenantId))
      .orderBy(desc(associationEvents.startDate));

    await tx
      .update(memberPortalInvitations)
      .set({
        status:
          invitation.status === "invited" ? "active" : invitation.status,
        lastViewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(memberPortalInvitations.id, invitation.id));

    return {
      associationName: tenant?.name ?? "Your association",
      memberName: membership.memberName,
      membership: {
        tier: membership.tier,
        status: membership.status,
        renewalDate: membership.renewalDate,
        duesCents: membership.duesCents,
      },
      benefits: benefitRows
        .filter((b) => b.isActive)
        .map((b) => ({
          id: b.id,
          name: b.name,
          partnerName: b.partnerName,
          category: b.category,
          description: b.description,
          redemptionDetails: b.redemptionDetails,
          url: b.url,
        })),
      events: eventRows
        .filter((e) => e.status !== "completed" && e.status !== "cancelled")
        .slice(0, 12)
        .map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          startDate: e.startDate,
          location: e.location,
          feeCents: e.feeCents,
        })),
    };
  });
}
