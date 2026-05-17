import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  insuredScheduleItems,
  policies,
  type InsuredScheduleItem,
} from "@prismcore/db";

export type { InsuredScheduleItem };
export type ScheduleItemType =
  | "vehicle"
  | "driver"
  | "location"
  | "equipment"
  | "other";

export interface ScheduleItemRow extends InsuredScheduleItem {
  policyNumber: string;
}

export async function listScheduleItems(
  tenantId: string,
): Promise<ScheduleItemRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ item: insuredScheduleItems, policy: policies })
      .from(insuredScheduleItems)
      .leftJoin(policies, eq(insuredScheduleItems.policyId, policies.id))
      .where(eq(insuredScheduleItems.tenantId, tenantId))
      .orderBy(desc(insuredScheduleItems.createdAt));
    return rows.map((r) => ({
      ...r.item,
      policyNumber: r.policy?.policyNumber ?? "—",
    }));
  });
}

export async function createScheduleItem(input: {
  tenantId: string;
  policyId: string;
  itemType: ScheduleItemType;
  description: string;
  identifier: string;
  valueCents: number;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(insuredScheduleItems).values(input);
  });
}
