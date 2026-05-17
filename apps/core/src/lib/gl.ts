import { asc, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  type ChartAccount,
  type JournalEntry,
} from "@prismcore/db";

export type { ChartAccount, JournalEntry };
export type GlAccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

/* ── Chart of accounts ──────────────────────────────────────────── */

export async function listAccounts(tenantId: string): Promise<ChartAccount[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, tenantId))
      .orderBy(asc(chartOfAccounts.accountNumber)),
  );
}

export async function createAccount(input: {
  tenantId: string;
  accountNumber: string;
  name: string;
  type: GlAccountType;
  subtype: string;
  description: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(chartOfAccounts).values(input);
  });
}

export async function updateAccount(input: {
  tenantId: string;
  id: string;
  accountNumber: string;
  name: string;
  type: GlAccountType;
  subtype: string;
  description: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(chartOfAccounts)
      .set({
        accountNumber: input.accountNumber,
        name: input.name,
        type: input.type,
        subtype: input.subtype,
        description: input.description,
        updatedAt: new Date(),
      })
      .where(eq(chartOfAccounts.id, input.id));
  });
}

export async function deleteAccount(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(chartOfAccounts).where(eq(chartOfAccounts.id, id));
  });
}

/* ── Journal entries ────────────────────────────────────────────── */

export interface JournalEntryRow extends JournalEntry {
  /** Sum of debit lines (a balanced entry's debits equal its credits). */
  totalCents: number;
  lineCount: number;
}

export async function listJournalEntries(
  tenantId: string,
): Promise<JournalEntryRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const entries = await tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, tenantId))
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt));
    const lines = await tx
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.tenantId, tenantId));

    const byEntry = new Map<string, { total: number; count: number }>();
    for (const line of lines) {
      const acc = byEntry.get(line.journalEntryId) ?? { total: 0, count: 0 };
      acc.total += line.debitCents;
      acc.count += 1;
      byEntry.set(line.journalEntryId, acc);
    }

    return entries.map((e) => ({
      ...e,
      totalCents: byEntry.get(e.id)?.total ?? 0,
      lineCount: byEntry.get(e.id)?.count ?? 0,
    }));
  });
}

/** Delete a journal entry; its lines cascade away with it. */
export async function deleteJournalEntry(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(journalEntries).where(eq(journalEntries.id, id));
  });
}

export interface JournalLineInput {
  accountId: string;
  debitCents: number;
  creditCents: number;
  lineMemo: string;
}

/**
 * Post a journal entry with its lines, in one transaction. Callers must have
 * already verified the entry balances (total debits === total credits).
 */
export async function createJournalEntry(input: {
  tenantId: string;
  entryNumber: string;
  entryDate: string | null;
  memo: string;
  lines: JournalLineInput[];
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    const inserted = await tx
      .insert(journalEntries)
      .values({
        tenantId: input.tenantId,
        entryNumber: input.entryNumber,
        entryDate: input.entryDate,
        memo: input.memo,
        source: "manual",
        status: "posted",
      })
      .returning();
    const entry = inserted[0]!;

    if (input.lines.length > 0) {
      await tx.insert(journalEntryLines).values(
        input.lines.map((l) => ({
          tenantId: input.tenantId,
          journalEntryId: entry.id,
          accountId: l.accountId,
          debitCents: l.debitCents,
          creditCents: l.creditCents,
          lineMemo: l.lineMemo,
        })),
      );
    }
  });
}
