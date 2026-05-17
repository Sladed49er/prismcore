"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCarrierContact,
  type CarrierContactRole,
} from "@/lib/carrier-contacts";

export async function newCarrierContact(input: {
  carrierId: string;
  name: string;
  title: string;
  role: CarrierContactRole;
  email: string;
  phone: string;
  notes: string;
}): Promise<void> {
  if (!input.carrierId || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createCarrierContact({
    tenantId: tenant.id,
    carrierId: input.carrierId,
    name: input.name.trim(),
    title: input.title.trim(),
    role: input.role,
    email: input.email.trim(),
    phone: input.phone.trim(),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/carriers/contacts");
}
