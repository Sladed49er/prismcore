import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  estimates,
  clients,
  type Estimate,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { Estimate };
export type EstimateStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "converted";

export interface EstimateRow extends Estimate {
  clientName: string;
}

export async function listEstimates(
  tenantId: string,
): Promise<EstimateRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ estimate: estimates, client: clients })
      .from(estimates)
      .leftJoin(clients, eq(estimates.clientId, clients.id))
      .where(eq(estimates.tenantId, tenantId))
      .orderBy(desc(estimates.createdAt));
    return rows.map((r) => ({
      ...r.estimate,
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createEstimate(input: {
  tenantId: string;
  clientId: string;
  estimateNumber: string;
  description: string;
  amountCents: number;
  status: EstimateStatus;
  validUntil: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(estimates).values(input);
  });
}

export async function setEstimateStatus(
  tenantId: string,
  estimateId: string,
  status: EstimateStatus,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(estimates)
      .set({ status, updatedAt: new Date() })
      .where(eq(estimates.id, estimateId));
  });
}
