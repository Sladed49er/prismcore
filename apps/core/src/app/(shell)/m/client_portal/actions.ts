"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createPortalInvitation,
  revokePortalInvitation,
  deletePortalInvitation,
} from "@/lib/client-portal";

/** Create (or reuse) a portal access token for a client; returns the token. */
export async function inviteClient(input: {
  clientId: string;
  email: string;
}): Promise<string> {
  const tenant = await getCurrentTenant();
  const token = await createPortalInvitation({
    tenantId: tenant.id,
    clientId: input.clientId,
    email: input.email.trim(),
  });
  revalidatePath("/m/client_portal");
  return token;
}

export async function revokeInvite(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await revokePortalInvitation(tenant.id, id);
  revalidatePath("/m/client_portal");
}

export async function deleteInvite(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deletePortalInvitation(tenant.id, id);
  revalidatePath("/m/client_portal");
}
