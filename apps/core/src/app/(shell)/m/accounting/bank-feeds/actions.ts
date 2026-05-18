"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createBankLinkSession,
  saveLinkedAccounts,
  syncBankFeedAccount,
  disconnectBankFeedAccount,
  setTransactionCategory,
  setTransactionReconciled,
} from "@/lib/bank-feed";

const PATH = "/m/accounting/bank-feeds";

/** Begin a Financial Connections link session; returns the client secret. */
export async function startBankLink(): Promise<string> {
  const tenant = await getCurrentTenant();
  return createBankLinkSession(tenant.id, tenant.name);
}

/** Persist the accounts the browser linked. */
export async function linkAccounts(
  fcAccountIds: string[],
): Promise<{ saved: number }> {
  const tenant = await getCurrentTenant();
  const ids = Array.isArray(fcAccountIds) ? fcAccountIds : [];
  const saved = await saveLinkedAccounts(tenant.id, ids);
  revalidatePath(PATH);
  return { saved };
}

export async function syncAccount(accountId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const tenant = await getCurrentTenant();
  const result = await syncBankFeedAccount(tenant.id, accountId);
  revalidatePath(PATH);
  return { ok: result.ok, message: result.message };
}

export async function removeAccount(accountId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await disconnectBankFeedAccount(tenant.id, accountId);
  revalidatePath(PATH);
}

export async function categorizeTransaction(input: {
  id: string;
  category: string;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setTransactionCategory({
    tenantId: tenant.id,
    id: input.id,
    category: input.category.trim(),
  });
  revalidatePath(PATH);
}

export async function toggleReconciled(input: {
  id: string;
  reconciled: boolean;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setTransactionReconciled({
    tenantId: tenant.id,
    id: input.id,
    reconciled: input.reconciled,
  });
  revalidatePath(PATH);
}
