import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  adminDb,
  portalInvitations,
  clients,
  policies,
  tenants,
  type PortalInvitation,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

/**
 * Client portal data layer.
 *
 * Two surfaces: the agency-facing management of access tokens (tenant-scoped
 * through `withTenantContext`), and the public, token-authenticated portal
 * view. The public lookup runs through `adminDb` because there is no user
 * session — it maps a token to its tenant, then reads that tenant's data
 * back inside `withTenantContext`, so RLS still scopes every read.
 */

export type PortalInvitationStatus = "invited" | "active" | "revoked";

export interface PortalInvitationRow extends PortalInvitation {
  clientName: string;
}

/** A client's active portal invitations, with the client's display name. */
export async function listPortalInvitations(
  tenantId: string,
): Promise<PortalInvitationRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ invitation: portalInvitations, client: clients })
      .from(portalInvitations)
      .leftJoin(clients, eq(portalInvitations.clientId, clients.id))
      .where(eq(portalInvitations.tenantId, tenantId))
      .orderBy(desc(portalInvitations.createdAt));
    return rows.map((r) => ({
      ...r.invitation,
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

/**
 * Create (or reuse) a portal access token for a client. If the client already
 * has a non-revoked invitation, that one is returned — a client has one link.
 */
export async function createPortalInvitation(input: {
  tenantId: string;
  clientId: string;
  email: string;
}): Promise<string> {
  return withTenantContext(input.tenantId, async (tx) => {
    const existing = await tx
      .select()
      .from(portalInvitations)
      .where(
        and(
          eq(portalInvitations.tenantId, input.tenantId),
          eq(portalInvitations.clientId, input.clientId),
        ),
      );
    const reusable = existing.find((i) => i.status !== "revoked");
    if (reusable) return reusable.token;

    const token = randomBytes(24).toString("hex");
    await tx.insert(portalInvitations).values({
      tenantId: input.tenantId,
      clientId: input.clientId,
      token,
      email: input.email,
      status: "invited",
    });
    return token;
  });
}

export async function revokePortalInvitation(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(portalInvitations)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(eq(portalInvitations.id, id));
  });
}

export async function deletePortalInvitation(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(portalInvitations).where(eq(portalInvitations.id, id));
  });
}

/** What an insured sees on the public portal — read-only policy summary. */
export interface PortalView {
  agencyName: string;
  clientName: string;
  policies: {
    id: string;
    policyNumber: string;
    lineOfBusiness: string;
    carrier: string;
    status: string;
    effectiveDate: string | null;
    expirationDate: string | null;
    premiumCents: number;
  }[];
}

/**
 * Resolve a portal token to the insured's read-only view. Returns null for an
 * unknown or revoked token. Stamps the first view as `active`.
 */
export async function getPortalView(
  token: string,
): Promise<PortalView | null> {
  if (!token) return null;

  // Token → tenant/client. No user session here, so this single lookup runs
  // as the owner; everything after is tenant-scoped.
  const [invitation] = await adminDb()
    .select()
    .from(portalInvitations)
    .where(eq(portalInvitations.token, token));
  if (!invitation || invitation.status === "revoked") return null;

  const [tenant] = await adminDb()
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, invitation.tenantId));

  return withTenantContext(invitation.tenantId, async (tx) => {
    const [client] = await tx
      .select()
      .from(clients)
      .where(eq(clients.id, invitation.clientId));
    if (!client) return null;

    const policyRows = await tx
      .select()
      .from(policies)
      .where(
        and(
          eq(policies.tenantId, invitation.tenantId),
          eq(policies.clientId, invitation.clientId),
        ),
      )
      .orderBy(desc(policies.effectiveDate));

    // First open flips the invitation to active; every view stamps the time.
    await tx
      .update(portalInvitations)
      .set({
        status: invitation.status === "invited" ? "active" : invitation.status,
        lastViewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(portalInvitations.id, invitation.id));

    return {
      agencyName: tenant?.name ?? "Your agency",
      clientName: clientDisplayName(client),
      policies: policyRows.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        lineOfBusiness: p.lineOfBusiness,
        carrier: p.carrier,
        status: p.status,
        effectiveDate: p.effectiveDate,
        expirationDate: p.expirationDate,
        premiumCents: p.premiumCents,
      })),
    };
  });
}
