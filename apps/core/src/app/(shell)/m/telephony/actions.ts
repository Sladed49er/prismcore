"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  connectProvider as connectProviderDb,
  disconnectProvider as disconnectProviderDb,
  simulateInboundCall,
  type VoipCredentials,
} from "@/lib/voip";

/** Connect a provider, or re-save its credentials. */
export async function connectProvider(
  providerId: string,
  credentials: VoipCredentials,
): Promise<void> {
  if (!providerId) return;
  const tenant = await getCurrentTenant();
  await connectProviderDb(tenant.id, providerId, {
    accountId: credentials.accountId.trim(),
    apiKey: credentials.apiKey.trim(),
    apiSecret: credentials.apiSecret.trim(),
    webhookSecret: credentials.webhookSecret.trim(),
  });
  revalidatePath("/m/telephony");
}

export async function disconnectProvider(providerId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await disconnectProviderDb(tenant.id, providerId);
  revalidatePath("/m/telephony");
}

export async function simulateCall(): Promise<void> {
  const tenant = await getCurrentTenant();
  await simulateInboundCall(tenant.id);
  revalidatePath("/m/telephony");
}
