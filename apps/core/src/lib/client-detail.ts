import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  clients,
  policies,
  claims,
  clientContacts,
  clientActivities,
  clientLocations,
  type Client,
  type Policy,
  type Claim,
  type ClientContact,
  type ClientActivity,
  type ClientLocation,
} from "@prismcore/db";

/**
 * Client detail loader — the anchor of the drill-down spine. One
 * `withTenantContext` pass gathers the client and everything hanging off it:
 * policies, the claims under those policies, contacts, locations, and the
 * activity log. RLS keeps it all tenant-scoped.
 */

/** A claim plus the policy number it was filed against. */
export interface ClientClaim extends Claim {
  policyNumber: string;
}

export interface ClientDetail {
  client: Client;
  policies: Policy[];
  claims: ClientClaim[];
  contacts: ClientContact[];
  locations: ClientLocation[];
  activities: ClientActivity[];
}

export async function loadClientDetail(
  tenantId: string,
  clientId: string,
): Promise<ClientDetail | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [client] = await tx
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));
    if (!client) return null;

    const [policyRows, contacts, locations, activities] = await Promise.all([
      tx
        .select()
        .from(policies)
        .where(eq(policies.clientId, clientId))
        .orderBy(desc(policies.createdAt)),
      tx
        .select()
        .from(clientContacts)
        .where(eq(clientContacts.clientId, clientId)),
      tx
        .select()
        .from(clientLocations)
        .where(eq(clientLocations.clientId, clientId)),
      tx
        .select()
        .from(clientActivities)
        .where(eq(clientActivities.clientId, clientId))
        .orderBy(desc(clientActivities.activityDate)),
    ]);

    const claimRows = await tx
      .select({ claim: claims, policyNumber: policies.policyNumber })
      .from(claims)
      .innerJoin(policies, eq(claims.policyId, policies.id))
      .where(and(eq(policies.clientId, clientId)))
      .orderBy(desc(claims.createdAt));

    return {
      client,
      policies: policyRows,
      claims: claimRows.map((r) => ({ ...r.claim, policyNumber: r.policyNumber })),
      contacts,
      locations,
      activities,
    };
  });
}
