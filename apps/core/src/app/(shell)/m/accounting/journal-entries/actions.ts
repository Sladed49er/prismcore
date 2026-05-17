"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createJournalEntry, deleteJournalEntry } from "@/lib/gl";

interface RawLine {
  accountId: string;
  debitDollars: string;
  creditDollars: string;
  lineMemo: string;
}

const toCents = (s: string): number =>
  Math.round((Number.parseFloat(s) || 0) * 100);

/**
 * Post a journal entry. The entry is rejected unless it has at least two lines
 * and its debits equal its credits — a journal entry must always balance.
 */
export async function postJournalEntry(input: {
  entryNumber: string;
  entryDate: string;
  memo: string;
  lines: RawLine[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!input.entryNumber.trim()) {
    return { ok: false, error: "An entry number is required." };
  }

  const lines = input.lines
    .filter((l) => l.accountId)
    .map((l) => ({
      accountId: l.accountId,
      debitCents: toCents(l.debitDollars),
      creditCents: toCents(l.creditDollars),
      lineMemo: l.lineMemo.trim(),
    }))
    .filter((l) => l.debitCents > 0 || l.creditCents > 0);

  if (lines.length < 2) {
    return { ok: false, error: "An entry needs at least two lines." };
  }
  const debits = lines.reduce((s, l) => s + l.debitCents, 0);
  const credits = lines.reduce((s, l) => s + l.creditCents, 0);
  if (debits !== credits) {
    return { ok: false, error: "Debits and credits must balance." };
  }

  const tenant = await getCurrentTenant();
  await createJournalEntry({
    tenantId: tenant.id,
    entryNumber: input.entryNumber.trim(),
    entryDate: input.entryDate || null,
    memo: input.memo.trim(),
    lines,
  });
  revalidatePath("/m/accounting/journal-entries");
  return { ok: true };
}

/** Delete a journal entry and its lines. */
export async function removeJournalEntry(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deleteJournalEntry(tenant.id, id);
  revalidatePath("/m/accounting/journal-entries");
}
