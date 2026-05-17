"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createAccount, type GlAccountType } from "@/lib/gl";

export async function addAccount(input: {
  accountNumber: string;
  name: string;
  type: GlAccountType;
  subtype: string;
  description: string;
}): Promise<void> {
  if (!input.accountNumber.trim() || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createAccount({
    tenantId: tenant.id,
    accountNumber: input.accountNumber.trim(),
    name: input.name.trim(),
    type: input.type,
    subtype: input.subtype.trim(),
    description: input.description.trim(),
  });
  revalidatePath("/m/accounting/chart-of-accounts");
}
