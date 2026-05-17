import { desc, eq } from "drizzle-orm";
import { withTenantContext, leads, type Lead } from "@prismcore/db";

export type { Lead };
export type LeadStatus =
  | "new"
  | "working"
  | "qualified"
  | "converted"
  | "disqualified";

export async function listLeads(tenantId: string): Promise<Lead[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(leads)
      .where(eq(leads.tenantId, tenantId))
      .orderBy(desc(leads.createdAt)),
  );
}

export async function createLead(input: {
  tenantId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  lineOfBusiness: string;
  estimatedValueCents: number;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(leads).values(input);
  });
}

export async function setLeadStatus(input: {
  tenantId: string;
  id: string;
  status: LeadStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(leads)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(leads.id, input.id));
  });
}
