import { asc, eq } from "drizzle-orm";
import {
  withTenantContext,
  trustLedgerEntries,
  type TrustLedgerEntry,
} from "@prismcore/db";

export type { TrustLedgerEntry };
export type TrustEntryType =
  | "premium_received"
  | "remitted"
  | "return"
  | "fee";

export interface TrustEntryRow extends TrustLedgerEntry {
  /** Trust balance after this entry. */
  runningBalanceCents: number;
}

/** Signed effect of an entry on the trust balance — premiums in, everything else out. */
function signedAmount(type: string, cents: number): number {
  return type === "premium_received" ? cents : -cents;
}

/**
 * The trust ledger, oldest first, each row carrying the running balance. The
 * current trust balance is the last row's runningBalanceCents.
 */
export async function listTrustEntries(
  tenantId: string,
): Promise<TrustEntryRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(trustLedgerEntries)
      .where(eq(trustLedgerEntries.tenantId, tenantId))
      .orderBy(
        asc(trustLedgerEntries.entryDate),
        asc(trustLedgerEntries.createdAt),
      );
    let balance = 0;
    return rows.map((e) => {
      balance += signedAmount(e.entryType, e.amountCents);
      return { ...e, runningBalanceCents: balance };
    });
  });
}

export async function createTrustEntry(input: {
  tenantId: string;
  entryType: TrustEntryType;
  amountCents: number;
  description: string;
  party: string;
  state: string;
  entryDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(trustLedgerEntries).values(input);
  });
}

export async function updateTrustEntry(input: {
  tenantId: string;
  id: string;
  entryType: TrustEntryType;
  amountCents: number;
  description: string;
  party: string;
  state: string;
  entryDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(trustLedgerEntries)
      .set({
        entryType: input.entryType,
        amountCents: input.amountCents,
        description: input.description,
        party: input.party,
        state: input.state,
        entryDate: input.entryDate,
      })
      .where(eq(trustLedgerEntries.id, input.id));
  });
}

export async function deleteTrustEntry(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(trustLedgerEntries)
      .where(eq(trustLedgerEntries.id, id));
  });
}
