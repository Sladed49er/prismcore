import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  retentionRecords,
  renewals,
  policies,
  clients,
  type RetentionRecord,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { RetentionRecord };
export type RetentionOutcome =
  | "renewed"
  | "rewritten"
  | "lost"
  | "non_renewed";
export type RetentionReason =
  | "price"
  | "coverage"
  | "service"
  | "carrier_exit"
  | "claims"
  | "other";

export interface RetentionRecordRow extends RetentionRecord {
  policyNumber: string;
  clientName: string;
}

export async function listRetentionRecords(
  tenantId: string,
): Promise<RetentionRecordRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ record: retentionRecords, policy: policies, client: clients })
      .from(retentionRecords)
      .leftJoin(renewals, eq(retentionRecords.renewalId, renewals.id))
      .leftJoin(policies, eq(renewals.policyId, policies.id))
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .where(eq(retentionRecords.tenantId, tenantId))
      .orderBy(desc(retentionRecords.recordedDate));
    return rows.map((r) => ({
      ...r.record,
      policyNumber: r.policy?.policyNumber ?? "—",
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createRetentionRecord(input: {
  tenantId: string;
  renewalId: string;
  outcome: RetentionOutcome;
  reasonCode: RetentionReason;
  priorPremiumCents: number;
  newPremiumCents: number;
  recordedDate: string | null;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(retentionRecords).values(input);
  });
}
