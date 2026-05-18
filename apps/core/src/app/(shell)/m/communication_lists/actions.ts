"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCommunicationList,
  updateCommunicationList,
  setCommunicationListActive,
  deleteCommunicationList,
  type CommunicationListType,
} from "@/lib/communication-lists";

const TYPES: CommunicationListType[] = [
  "committee",
  "distribution",
  "working_group",
  "board",
];

export interface CommunicationListForm {
  name: string;
  type: string;
  purpose: string;
  memberCount: string;
  ownerName: string;
  notes: string;
}

function normalize(form: CommunicationListForm) {
  return {
    name: form.name.trim(),
    type: TYPES.includes(form.type as CommunicationListType)
      ? (form.type as CommunicationListType)
      : "distribution",
    purpose: form.purpose.trim(),
    memberCount: Math.max(
      0,
      Math.round(Number.parseFloat(form.memberCount) || 0),
    ),
    ownerName: form.ownerName.trim(),
    notes: form.notes.trim(),
  };
}

export async function newCommunicationList(
  form: CommunicationListForm,
): Promise<void> {
  if (!form.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createCommunicationList({ tenantId: tenant.id, ...normalize(form) });
  revalidatePath("/m/communication_lists");
}

export async function editCommunicationList(
  input: { id: string } & CommunicationListForm,
): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateCommunicationList({
    tenantId: tenant.id,
    id: input.id,
    ...normalize(input),
  });
  revalidatePath("/m/communication_lists");
}

export async function toggleCommunicationListActive(input: {
  id: string;
  isActive: boolean;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setCommunicationListActive({
    tenantId: tenant.id,
    id: input.id,
    isActive: input.isActive,
  });
  revalidatePath("/m/communication_lists");
}

export async function removeCommunicationList(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteCommunicationList(tenant.id, id);
  revalidatePath("/m/communication_lists");
}
