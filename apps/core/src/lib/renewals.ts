import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  renewals,
  policies,
  clients,
  type Renewal,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { Renewal };
export type RenewalStage =
  | "not_started"
  | "in_progress"
  | "quoted"
  | "renewed"
  | "lost";

export interface RenewalRow extends Renewal {
  policyNumber: string;
  lineOfBusiness: string;
  carrier: string;
  clientName: string;
}

/** The tenant's renewal worklist, joined to policy + insured. RLS-isolated. */
export async function listRenewals(tenantId: string): Promise<RenewalRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ renewal: renewals, policy: policies, client: clients })
      .from(renewals)
      .leftJoin(policies, eq(renewals.policyId, policies.id))
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .where(eq(renewals.tenantId, tenantId))
      .orderBy(desc(renewals.createdAt));
    return rows.map((r) => ({
      ...r.renewal,
      policyNumber: r.policy?.policyNumber ?? "—",
      lineOfBusiness: r.policy?.lineOfBusiness ?? "",
      carrier: r.policy?.carrier ?? "",
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createRenewal(input: {
  tenantId: string;
  policyId: string;
  stage: RenewalStage;
  dueDate: string | null;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(renewals).values(input);
  });
}

export async function setRenewalStage(
  tenantId: string,
  renewalId: string,
  stage: RenewalStage,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(renewals)
      .set({ stage, updatedAt: new Date() })
      .where(eq(renewals.id, renewalId));
  });
}
