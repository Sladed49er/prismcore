"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { sendCampaign, type SendResult } from "@/lib/marketing-engine";

/** Send a template as a campaign blast to every client with an email. */
export async function sendBlast(
  campaignId: string,
  templateId: string,
): Promise<SendResult> {
  if (!campaignId || !templateId) {
    return { ok: false, message: "Pick a campaign and a template.", sent: 0 };
  }
  const tenant = await getCurrentTenant();
  const result = await sendCampaign(tenant.id, campaignId, templateId);
  revalidatePath("/m/marketing");
  return result;
}
