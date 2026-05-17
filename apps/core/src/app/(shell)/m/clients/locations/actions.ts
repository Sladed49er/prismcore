"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createClientLocation,
  updateClientLocation,
  deleteClientLocation,
  type ClientLocationType,
} from "@/lib/client-locations";

export async function newClientLocation(input: {
  clientId: string;
  label: string;
  locationType: ClientLocationType;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
}): Promise<void> {
  if (!input.clientId) return;
  const tenant = await getCurrentTenant();
  await createClientLocation({
    tenantId: tenant.id,
    clientId: input.clientId,
    label: input.label.trim(),
    locationType: input.locationType,
    addressLine: input.addressLine.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
  });
  revalidatePath("/m/clients/locations");
}

export async function editClientLocation(input: {
  id: string;
  clientId: string;
  label: string;
  locationType: ClientLocationType;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
}): Promise<void> {
  if (!input.id || !input.clientId) return;
  const tenant = await getCurrentTenant();
  await updateClientLocation({
    tenantId: tenant.id,
    id: input.id,
    clientId: input.clientId,
    label: input.label.trim(),
    locationType: input.locationType,
    addressLine: input.addressLine.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
  });
  revalidatePath("/m/clients/locations");
}

export async function removeClientLocation(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deleteClientLocation(tenant.id, id);
  revalidatePath("/m/clients/locations");
}
