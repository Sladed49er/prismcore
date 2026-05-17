"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createCertificateHolder } from "@/lib/certificate-holders";

export async function newCertificateHolder(input: {
  name: string;
  address: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createCertificateHolder({
    tenantId: tenant.id,
    name: input.name.trim(),
    address: input.address.trim(),
    contactName: input.contactName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/certificates/holders");
}
