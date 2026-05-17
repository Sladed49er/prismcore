import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listJournalEntries, listAccounts } from "@/lib/gl";
import {
  JournalEntriesPanel,
  type JournalEntryDTO,
  type AccountOption,
} from "@/components/journal-entries-panel";

export default async function JournalEntriesPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const [entryRows, accountRows] = await Promise.all([
    listJournalEntries(config.id),
    listAccounts(config.id),
  ]);

  const entries: JournalEntryDTO[] = entryRows.map((e) => ({
    id: e.id,
    entryNumber: e.entryNumber,
    entryDate: e.entryDate,
    memo: e.memo,
    totalCents: e.totalCents,
    lineCount: e.lineCount,
    status: e.status,
  }));
  const accounts: AccountOption[] = accountRows
    .filter((a) => a.isActive)
    .map((a) => ({ id: a.id, label: `${a.accountNumber} — ${a.name}` }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Journal Entries</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Double-entry GL postings. Every entry must balance — debits equal
        credits — before it can be posted.
      </p>
      <JournalEntriesPanel entries={entries} accounts={accounts} />
    </div>
  );
}
