import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  renewalOffers,
  renewals,
  policies,
  clients,
  type RenewalOffer,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { RenewalOffer };
export type RenewalOfferStatus =
  | "draft"
  | "presented"
  | "accepted"
  | "declined";

export interface RenewalOfferRow extends RenewalOffer {
  policyNumber: string;
  clientName: string;
  /** Premium − prior premium: the change the insured is being offered. */
  changeCents: number;
}

export async function listRenewalOffers(
  tenantId: string,
): Promise<RenewalOfferRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ offer: renewalOffers, policy: policies, client: clients })
      .from(renewalOffers)
      .leftJoin(renewals, eq(renewalOffers.renewalId, renewals.id))
      .leftJoin(policies, eq(renewals.policyId, policies.id))
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .where(eq(renewalOffers.tenantId, tenantId))
      .orderBy(desc(renewalOffers.createdAt));
    return rows.map((r) => ({
      ...r.offer,
      policyNumber: r.policy?.policyNumber ?? "—",
      clientName: r.client ? clientDisplayName(r.client) : "—",
      changeCents: r.offer.premiumCents - r.offer.priorPremiumCents,
    }));
  });
}

export async function createRenewalOffer(input: {
  tenantId: string;
  renewalId: string;
  carrierName: string;
  offerDate: string | null;
  premiumCents: number;
  priorPremiumCents: number;
  termSummary: string;
  expiresDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(renewalOffers).values(input);
  });
}

export async function setRenewalOfferStatus(input: {
  tenantId: string;
  id: string;
  status: RenewalOfferStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(renewalOffers)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(renewalOffers.id, input.id));
  });
}
