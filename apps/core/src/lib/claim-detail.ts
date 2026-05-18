import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  claims,
  policies,
  clients,
  claimNotes,
  claimReserveEntries,
  claimPayments,
  claimRecoveries,
  claimParties,
  claimLitigation,
  type Claim,
  type Policy,
  type Client,
} from "@prismcore/db";

/**
 * Claim detail loader — the end of the drill-down spine. One
 * `withTenantContext` pass gathers the claim, the policy and insured it sits
 * under, and the full claim file: diary notes, the reserve ledger, payments,
 * recoveries, parties, and litigation. RLS keeps it tenant-scoped.
 */

export interface ClaimDetail {
  claim: Claim;
  policy: Policy | null;
  client: Client | null;
  notes: (typeof claimNotes.$inferSelect)[];
  reserves: (typeof claimReserveEntries.$inferSelect)[];
  payments: (typeof claimPayments.$inferSelect)[];
  recoveries: (typeof claimRecoveries.$inferSelect)[];
  parties: (typeof claimParties.$inferSelect)[];
  litigation: (typeof claimLitigation.$inferSelect)[];
}

export async function loadClaimDetail(
  tenantId: string,
  claimId: string,
): Promise<ClaimDetail | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [claim] = await tx.select().from(claims).where(eq(claims.id, claimId));
    if (!claim) return null;

    const [policyRow] = await tx
      .select()
      .from(policies)
      .where(eq(policies.id, claim.policyId));
    const clientRow = policyRow
      ? await tx.select().from(clients).where(eq(clients.id, policyRow.clientId))
      : [];

    const [notes, reserves, payments, recoveries, parties, litigation] =
      await Promise.all([
        tx
          .select()
          .from(claimNotes)
          .where(eq(claimNotes.claimId, claimId))
          .orderBy(desc(claimNotes.noteDate)),
        tx
          .select()
          .from(claimReserveEntries)
          .where(eq(claimReserveEntries.claimId, claimId))
          .orderBy(desc(claimReserveEntries.entryDate)),
        tx
          .select()
          .from(claimPayments)
          .where(eq(claimPayments.claimId, claimId))
          .orderBy(desc(claimPayments.paymentDate)),
        tx
          .select()
          .from(claimRecoveries)
          .where(eq(claimRecoveries.claimId, claimId)),
        tx.select().from(claimParties).where(eq(claimParties.claimId, claimId)),
        tx
          .select()
          .from(claimLitigation)
          .where(eq(claimLitigation.claimId, claimId)),
      ]);

    return {
      claim,
      policy: policyRow ?? null,
      client: clientRow[0] ?? null,
      notes,
      reserves,
      payments,
      recoveries,
      parties,
      litigation,
    };
  });
}
