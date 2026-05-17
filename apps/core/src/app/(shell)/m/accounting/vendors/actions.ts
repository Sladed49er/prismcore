"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createVendor,
  updateVendor,
  deleteVendor,
  type VendorType,
} from "@/lib/ap";

export async function addVendor(input: {
  name: string;
  type: VendorType;
  email: string;
  phone: string;
  paymentTerms: string;
  is1099: boolean;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createVendor({
    tenantId: tenant.id,
    name: input.name.trim(),
    type: input.type,
    email: input.email.trim(),
    phone: input.phone.trim(),
    paymentTerms: input.paymentTerms.trim() || "Net 30",
    is1099: input.is1099,
  });
  revalidatePath("/m/accounting/vendors");
}

export async function editVendor(input: {
  id: string;
  name: string;
  type: VendorType;
  email: string;
  phone: string;
  paymentTerms: string;
  is1099: boolean;
}): Promise<void> {
  if (!input.id || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateVendor({
    tenantId: tenant.id,
    id: input.id,
    name: input.name.trim(),
    type: input.type,
    email: input.email.trim(),
    phone: input.phone.trim(),
    paymentTerms: input.paymentTerms.trim() || "Net 30",
    is1099: input.is1099,
  });
  revalidatePath("/m/accounting/vendors");
}

export async function removeVendor(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deleteVendor(tenant.id, id);
  revalidatePath("/m/accounting/vendors");
}
