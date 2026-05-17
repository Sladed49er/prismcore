import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  opportunities,
  clients,
  type Opportunity,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { Opportunity };
export type PipelineStage = "new" | "contacted" | "quoted" | "won" | "lost";

export interface OpportunityRow extends Opportunity {
  clientName: string;
}

export async function listOpportunities(
  tenantId: string,
): Promise<OpportunityRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ opportunity: opportunities, client: clients })
      .from(opportunities)
      .leftJoin(clients, eq(opportunities.clientId, clients.id))
      .where(eq(opportunities.tenantId, tenantId))
      .orderBy(desc(opportunities.createdAt));
    return rows.map((r) => ({
      ...r.opportunity,
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createOpportunity(input: {
  tenantId: string;
  clientId: string;
  name: string;
  stage: PipelineStage;
  valueCents: number;
  notes: string;
  expectedCloseDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(opportunities).values(input);
  });
}

export async function setOpportunityStage(
  tenantId: string,
  opportunityId: string,
  stage: PipelineStage,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(opportunities)
      .set({ stage, updatedAt: new Date() })
      .where(eq(opportunities.id, opportunityId));
  });
}
