import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  policies,
  clients,
  policyCoverages,
  policyEndorsements,
  claims,
  policyCancellations,
  premiumInstallments,
  insuredScheduleItems,
  premiumAudits,
  serviceActivities,
  policyDocuments,
  type Policy,
  type Client,
  type Claim,
} from "@prismcore/db";

/**
 * Policy detail loader — the middle of the drill-down spine. One
 * `withTenantContext` pass gathers the policy, its insured, and every record
 * filed against it: coverages, endorsements, claims, cancellations, billing
 * installments, scheduled items, premium audits, service activities, and
 * policy documents. RLS keeps it tenant-scoped.
 */

export interface PolicyDetail {
  policy: Policy;
  client: Client | null;
  coverages: (typeof policyCoverages.$inferSelect)[];
  endorsements: (typeof policyEndorsements.$inferSelect)[];
  claims: Claim[];
  cancellations: (typeof policyCancellations.$inferSelect)[];
  installments: (typeof premiumInstallments.$inferSelect)[];
  scheduleItems: (typeof insuredScheduleItems.$inferSelect)[];
  audits: (typeof premiumAudits.$inferSelect)[];
  serviceActivities: (typeof serviceActivities.$inferSelect)[];
  documents: (typeof policyDocuments.$inferSelect)[];
}

export async function loadPolicyDetail(
  tenantId: string,
  policyId: string,
): Promise<PolicyDetail | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [policy] = await tx
      .select()
      .from(policies)
      .where(eq(policies.id, policyId));
    if (!policy) return null;

    const [
      clientRow,
      coverages,
      endorsements,
      claimRows,
      cancellations,
      installments,
      scheduleItems,
      audits,
      serviceRows,
      documents,
    ] = await Promise.all([
      tx.select().from(clients).where(eq(clients.id, policy.clientId)),
      tx
        .select()
        .from(policyCoverages)
        .where(eq(policyCoverages.policyId, policyId)),
      tx
        .select()
        .from(policyEndorsements)
        .where(eq(policyEndorsements.policyId, policyId))
        .orderBy(desc(policyEndorsements.effectiveDate)),
      tx
        .select()
        .from(claims)
        .where(eq(claims.policyId, policyId))
        .orderBy(desc(claims.createdAt)),
      tx
        .select()
        .from(policyCancellations)
        .where(eq(policyCancellations.policyId, policyId)),
      tx
        .select()
        .from(premiumInstallments)
        .where(eq(premiumInstallments.policyId, policyId))
        .orderBy(premiumInstallments.installmentNumber),
      tx
        .select()
        .from(insuredScheduleItems)
        .where(eq(insuredScheduleItems.policyId, policyId)),
      tx
        .select()
        .from(premiumAudits)
        .where(eq(premiumAudits.policyId, policyId)),
      tx
        .select()
        .from(serviceActivities)
        .where(eq(serviceActivities.policyId, policyId))
        .orderBy(desc(serviceActivities.dueDate)),
      tx
        .select()
        .from(policyDocuments)
        .where(eq(policyDocuments.policyId, policyId)),
    ]);

    return {
      policy,
      client: clientRow[0] ?? null,
      coverages,
      endorsements,
      claims: claimRows,
      cancellations,
      installments,
      scheduleItems,
      audits,
      serviceActivities: serviceRows,
      documents,
    };
  });
}
