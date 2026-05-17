"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createCarrier, type CarrierStatus } from "@/lib/carriers";

export async function addCarrier(input: {
  name: string;
  naicCode: string;
  appetite: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: CarrierStatus;
  notes: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createCarrier({
    tenantId: tenant.id,
    name: input.name.trim(),
    naicCode: input.naicCode.trim(),
    appetite: input.appetite.trim(),
    contactName: input.contactName.trim(),
    contactEmail: input.contactEmail.trim(),
    contactPhone: input.contactPhone.trim(),
    status: input.status,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/carriers/directory");
}
