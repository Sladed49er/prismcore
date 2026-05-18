"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createMemberPortalInvitation,
  revokeMemberPortalInvitation,
  deleteMemberPortalInvitation,
} from "@/lib/member-portal";

/** Create (or reuse) a portal access token for a member; returns the token. */
export async function inviteMember(input: {
  membershipId: string;
  memberName: string;
  email: string;
}): Promise<string> {
  if (!input.membershipId) return "";
  const tenant = await getCurrentTenant();
  const token = await createMemberPortalInvitation({
    tenantId: tenant.id,
    membershipId: input.membershipId,
    memberName: input.memberName,
    email: input.email.trim(),
  });
  revalidatePath("/m/member_portal");
  return token;
}

export async function revokeMember(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await revokeMemberPortalInvitation(tenant.id, id);
  revalidatePath("/m/member_portal");
}

export async function deleteMember(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteMemberPortalInvitation(tenant.id, id);
  revalidatePath("/m/member_portal");
}
