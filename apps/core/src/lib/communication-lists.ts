import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  communicationLists,
  type CommunicationList,
} from "@prismcore/db";

/**
 * Communication lists data layer — association committees and distribution
 * lists. RLS-scoped through `withTenantContext`.
 */

export type { CommunicationList };

export type CommunicationListType =
  | "committee"
  | "distribution"
  | "working_group"
  | "board";

export async function listCommunicationLists(
  tenantId: string,
): Promise<CommunicationList[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(communicationLists)
      .where(eq(communicationLists.tenantId, tenantId))
      .orderBy(desc(communicationLists.createdAt)),
  );
}

export async function createCommunicationList(input: {
  tenantId: string;
  name: string;
  type: CommunicationListType;
  purpose: string;
  memberCount: number;
  ownerName: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(communicationLists).values(input);
  });
}

export async function updateCommunicationList(input: {
  tenantId: string;
  id: string;
  name: string;
  type: CommunicationListType;
  purpose: string;
  memberCount: number;
  ownerName: string;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(communicationLists)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(communicationLists.id, id));
  });
}

export async function setCommunicationListActive(input: {
  tenantId: string;
  id: string;
  isActive: boolean;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(communicationLists)
      .set({ isActive: input.isActive, updatedAt: new Date() })
      .where(eq(communicationLists.id, input.id));
  });
}

export async function deleteCommunicationList(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(communicationLists)
      .where(eq(communicationLists.id, id));
  });
}
