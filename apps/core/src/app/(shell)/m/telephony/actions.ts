"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  connectProvider as connectProviderDb,
  disconnectProvider as disconnectProviderDb,
  simulateInboundCall,
} from "@/lib/voip";

export async function connectProvider(providerId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await connectProviderDb(tenant.id, providerId);
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
