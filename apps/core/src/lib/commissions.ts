import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  commissions,
  policies,
  clients,
  type Commission,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { Commission };
export type CommissionStatus = "pending" | "received" | "reconciled";

export interface CommissionRow extends Commission {
  policyNumber: string;
  clientName: string;
}

export async function listCommissions(
  tenantId: string,
): Promise<CommissionRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ commission: commissions, policy: policies, client: clients })
      .from(commissions)
      .leftJoin(policies, eq(commissions.policyId, policies.id))
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .where(eq(commissions.tenantId, tenantId))
      .orderBy(desc(commissions.createdAt));
    return rows.map((r) => ({
      ...r.commission,
      policyNumber: r.policy?.policyNumber ?? "—",
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createCommission(input: {
  tenantId: string;
  policyId: string;
  amountCents: number;
  ratePercent: string;
  status: CommissionStatus;
  receivedDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(commissions).values(input);
  });
}

export async function setCommissionStatus(
  tenantId: string,
  commissionId: string,
  status: CommissionStatus,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(commissions)
      .set({ status, updatedAt: new Date() })
      .where(eq(commissions.id, commissionId));
  });
}
