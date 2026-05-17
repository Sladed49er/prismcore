"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  connectProvider as connectProviderDb,
  disconnectProvider as disconnectProviderDb,
  simulateInboundCall,
  connectAms as connectAmsDb,
  disconnectAms as disconnectAmsDb,
  type VoipCredentials,
} from "@/lib/voip";
import { getAmsConnection } from "@/lib/ams";
import { AMS360Adapter } from "@/lib/ams/ams360";

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

/** AMS connection form fields as the panel submits them. */
export interface AmsFormInput {
  provider: string;
  endpoint: string;
  username: string;
  password: string;
  employeeCode: string;
  webTenantId: string;
  autoSyncCalls: boolean;
  screenPopEnabled: boolean;
}

/**
 * Resolve the password to store: a blank field on an already-connected AMS
 * means "keep the existing password" — the panel never receives it back.
 */
async function resolveAmsPassword(
  tenantId: string,
  submitted: string,
): Promise<string> {
  if (submitted.trim()) return submitted.trim();
  const existing = await getAmsConnection(tenantId);
  return existing?.password ?? "";
}

/** Connect — or re-save — the tenant's agency-management system. */
export async function connectAms(input: AmsFormInput): Promise<void> {
  const tenant = await getCurrentTenant();
  const password = await resolveAmsPassword(tenant.id, input.password);
  await connectAmsDb(tenant.id, {
    provider: input.provider,
    endpoint: input.endpoint.trim(),
    username: input.username.trim(),
    password,
    employeeCode: input.employeeCode.trim(),
    webTenantId: input.webTenantId.trim(),
    autoSyncCalls: input.autoSyncCalls,
    screenPopEnabled: input.screenPopEnabled,
  });
  revalidatePath("/m/telephony");
}

export async function disconnectAms(): Promise<void> {
  const tenant = await getCurrentTenant();
  await disconnectAmsDb(tenant.id);
  revalidatePath("/m/telephony");
}

/** Test AMS credentials live, without saving them. */
export async function testAms(
  input: AmsFormInput,
): Promise<{ success: boolean; message: string }> {
  const tenant = await getCurrentTenant();
  const password = await resolveAmsPassword(tenant.id, input.password);
  if (!input.endpoint.trim() || !input.username.trim() || !password) {
    return { success: false, message: "Endpoint, username and password are required." };
  }
  if (input.provider !== "ams360") {
    return { success: false, message: `Unsupported AMS provider: ${input.provider}` };
  }
  const adapter = new AMS360Adapter({
    endpoint: input.endpoint.trim(),
    username: input.username.trim(),
    password,
    employeeCode: input.employeeCode.trim() || undefined,
  });
  return adapter.testConnection();
}
