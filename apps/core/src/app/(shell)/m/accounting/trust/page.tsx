import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listTrustEntries } from "@/lib/trust";
import { TrustPanel, type TrustEntryDTO } from "@/components/trust-panel";

export default async function TrustPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listTrustEntries(config.id);

  const entries: TrustEntryDTO[] = rows.map((e) => ({
    id: e.id,
    entryType: e.entryType,
    amountCents: e.amountCents,
    description: e.description,
    party: e.party,
    state: e.state,
    entryDate: e.entryDate,
    runningBalanceCents: e.runningBalanceCents,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Trust Accounting</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The fiduciary premium trust ledger — premiums held for carriers, with a
        running balance.
      </p>
      <TrustPanel entries={entries} />
    </div>
  );
}
