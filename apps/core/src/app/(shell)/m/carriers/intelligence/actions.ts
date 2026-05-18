"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  addAppetiteRule,
  deleteAppetiteRule,
  matchCarriers,
  type Appetite,
  type AppetiteMatch,
} from "@/lib/carrier-appetite";

const PATH = "/m/carriers/intelligence";

/** Add a carrier appetite rule. */
export async function createAppetiteRule(input: {
  carrierId: string;
  naicsPrefix: string;
  appetite: Appetite;
  lineOfBusiness: string;
  notes: string;
}): Promise<void> {
  const naicsPrefix = input.naicsPrefix.trim();
  if (!input.carrierId || !naicsPrefix) return;
  const tenant = await getCurrentTenant();
  await addAppetiteRule({ tenantId: tenant.id, ...input, naicsPrefix });
  revalidatePath(PATH);
}

/** Delete a carrier appetite rule. */
export async function removeAppetiteRule(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteAppetiteRule(tenant.id, id);
  revalidatePath(PATH);
}

/** Match carriers to a risk's NAICS code. */
export async function runAppetiteMatch(
  naicsCode: string,
  lineOfBusiness: string,
): Promise<AppetiteMatch[]> {
  const tenant = await getCurrentTenant();
  return matchCarriers(tenant.id, naicsCode, lineOfBusiness);
}
