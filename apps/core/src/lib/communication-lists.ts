import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  communicationLists,
  communicationListMembers,
  type CommunicationList,
  type CommunicationListMember,
} from "@prismcore/db";

/**
 * Communication lists data layer — association committees and distribution
 * lists, and the people on them. RLS-scoped through `withTenantContext`.
 */

export type { CommunicationList, CommunicationListMember };

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

/* ── List members ─────────────────────────────────────────────────── */

export interface CommunicationListMemberRow extends CommunicationListMember {
  listName: string;
}

export async function listCommunicationListMembers(
  tenantId: string,
): Promise<CommunicationListMemberRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        member: communicationListMembers,
        list: communicationLists,
      })
      .from(communicationListMembers)
      .leftJoin(
        communicationLists,
        eq(communicationListMembers.listId, communicationLists.id),
      )
      .where(eq(communicationListMembers.tenantId, tenantId))
      .orderBy(desc(communicationListMembers.createdAt));
    return rows.map((r) => ({
      ...r.member,
      listName: r.list?.name ?? "—",
    }));
  });
}

export async function createCommunicationListMember(input: {
  tenantId: string;
  listId: string;
  name: string;
  email: string;
  role: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(communicationListMembers).values(input);
  });
}

export async function deleteCommunicationListMember(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(communicationListMembers)
      .where(eq(communicationListMembers.id, id));
  });
}
