import { desc, eq } from "drizzle-orm";
import { withTenantContext, policies, clients, type Policy } from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { Policy };
export type PolicyStatus = "quoted" | "active" | "expired" | "cancelled";

export interface PolicyWithClient extends Policy {
  clientName: string;
}

/** A tenant's policies, each joined to its insured. RLS-isolated. */
export async function listPolicies(
  tenantId: string,
): Promise<PolicyWithClient[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ policy: policies, client: clients })
      .from(policies)
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .where(eq(policies.tenantId, tenantId))
      .orderBy(desc(policies.createdAt));
    return rows.map((r) => ({
      ...r.policy,
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createPolicy(input: {
  tenantId: string;
  clientId: string;
  policyNumber: string;
  lineOfBusiness: string;
  carrier: string;
  status: PolicyStatus;
  effectiveDate: string | null;
  expirationDate: string | null;
  premiumCents: number;
  customValues: Record<string, string>;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(policies).values(input);
  });
}
