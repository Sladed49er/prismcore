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

/**
 * A safe, meaningful message for a failed Stripe call. Stripe's own error
 * messages are user-facing and contain no secrets, so they are surfaced
 * directly — unlike an uncaught throw, which Next.js redacts in production to
 * an unhelpful "an error occurred" string.
 */
function stripeErrorMessage(error: unknown): string {
  const e = error as { type?: unknown; message?: unknown } | null;
  if (
    e &&
    typeof e.type === "string" &&
    e.type.startsWith("Stripe") &&
    typeof e.message === "string"
  ) {
    return e.message;
  }
  return "Couldn't start bank linking — please try again.";
}

export type StartBankLinkResult =
  | { ok: true; clientSecret: string }
  | { ok: false; error: string };

/**
 * Begin a Financial Connections link session. Returns a result object rather
 * than throwing, so the panel can show the real reason (e.g. Financial
 * Connections not yet registered) instead of a redacted error.
 */
export async function startBankLink(): Promise<StartBankLinkResult> {
  const tenant = await getCurrentTenant();
  try {
    const clientSecret = await createBankLinkSession(tenant.id, tenant.name);
    return { ok: true, clientSecret };
  } catch (error) {
    return { ok: false, error: stripeErrorMessage(error) };
  }
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
