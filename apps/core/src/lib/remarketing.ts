import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  remarketingQuotes,
  renewals,
  policies,
  clients,
  type RemarketingQuote,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { RemarketingQuote };
export type RemarketingQuoteStatus =
  | "requested"
  | "received"
  | "declined"
  | "selected";

export interface RemarketingQuoteRow extends RemarketingQuote {
  policyNumber: string;
  clientName: string;
}

export async function listRemarketingQuotes(
  tenantId: string,
): Promise<RemarketingQuoteRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ quote: remarketingQuotes, policy: policies, client: clients })
      .from(remarketingQuotes)
      .leftJoin(renewals, eq(remarketingQuotes.renewalId, renewals.id))
      .leftJoin(policies, eq(renewals.policyId, policies.id))
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .where(eq(remarketingQuotes.tenantId, tenantId))
      .orderBy(desc(remarketingQuotes.createdAt));
    return rows.map((r) => ({
      ...r.quote,
      policyNumber: r.policy?.policyNumber ?? "—",
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createRemarketingQuote(input: {
  tenantId: string;
  renewalId: string;
  carrierName: string;
  quotedPremiumCents: number;
  coverageSummary: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(remarketingQuotes).values(input);
  });
}

export async function setRemarketingQuoteStatus(input: {
  tenantId: string;
  id: string;
  status: RemarketingQuoteStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(remarketingQuotes)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(remarketingQuotes.id, input.id));
  });
}
