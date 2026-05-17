"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createClient,
  type ClientType,
  type ClientStatus,
} from "@/lib/clients";

const blank = (s: string): string | null => (s.trim() === "" ? null : s.trim());

export async function addClient(input: {
  type: ClientType;
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: ClientStatus;
  customValues: Record<string, string>;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await createClient({
    tenantId: tenant.id,
    type: input.type,
    firstName: blank(input.firstName),
    lastName: blank(input.lastName),
    businessName: blank(input.businessName),
    email: blank(input.email),
    phone: blank(input.phone),
    city: blank(input.city),
    state: blank(input.state),
    status: input.status,
    customValues: input.customValues,
  });
  revalidatePath("/m/clients/register");
}
