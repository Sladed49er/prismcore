"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createClientContact,
  type ClientContactRole,
} from "@/lib/client-contacts";

export async function newClientContact(input: {
  clientId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role: ClientContactRole;
  notes: string;
}): Promise<void> {
  if (!input.clientId || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createClientContact({
    tenantId: tenant.id,
    clientId: input.clientId,
    name: input.name.trim(),
    title: input.title.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    role: input.role,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/clients/contacts");
}
