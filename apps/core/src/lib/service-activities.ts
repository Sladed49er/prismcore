import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  serviceActivities,
  policies,
  type ServiceActivity,
} from "@prismcore/db";

export type { ServiceActivity };
export type ServiceActivityType =
  | "inquiry"
  | "change_request"
  | "coverage_review"
  | "claim_follow_up"
  | "document_request"
  | "other";
export type ServiceActivityStatus = "open" | "in_progress" | "completed";

export interface ServiceActivityRow extends ServiceActivity {
  policyNumber: string;
}

export async function listServiceActivities(
  tenantId: string,
): Promise<ServiceActivityRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ act: serviceActivities, policy: policies })
      .from(serviceActivities)
      .leftJoin(policies, eq(serviceActivities.policyId, policies.id))
      .where(eq(serviceActivities.tenantId, tenantId))
      .orderBy(desc(serviceActivities.createdAt));
    return rows.map((r) => ({
      ...r.act,
      policyNumber: r.policy?.policyNumber ?? "—",
    }));
  });
}

export async function createServiceActivity(input: {
  tenantId: string;
  policyId: string;
  activityType: ServiceActivityType;
  subject: string;
  detail: string;
  assignedTo: string;
  dueDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(serviceActivities).values(input);
  });
}

export async function setServiceActivityStatus(input: {
  tenantId: string;
  id: string;
  status: ServiceActivityStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(serviceActivities)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(serviceActivities.id, input.id));
  });
}
