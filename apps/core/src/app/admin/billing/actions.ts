"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setBillingOverride } from "@/lib/billing";

/** Save a tenant's billing override — platform admin only. */
export async function saveBillingOverride(input: {
  tenantId: string;
  customPriceDollars: string;
  comp: boolean;
  billingNotes: string;
}): Promise<void> {
  await requireAdmin();
  if (!input.tenantId) return;

  const dollars = input.customPriceDollars.trim();
  const customPriceCents =
    dollars === ""
      ? null
      : Math.max(0, Math.round((Number.parseFloat(dollars) || 0) * 100));

  await setBillingOverride({
    tenantId: input.tenantId,
    customPriceCents,
    comp: input.comp,
    billingNotes: input.billingNotes.trim(),
  });
  revalidatePath("/admin/billing");
}
