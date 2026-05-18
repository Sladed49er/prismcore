import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listTrustEntries } from "@/lib/trust";
import { TrustPanel, type TrustEntryDTO } from "@/components/trust-panel";

/**
 * Trust Accounting module — the fiduciary premium trust ledger.
 *
 * The trust ledger is also reachable inside the Accounting hub
 * (`/m/accounting/trust`); this is the standalone surface for tenants that
 * enable Trust Accounting on its own.
 */
export default async function TrustAccountingPage() {
  await requireModule("trust_accounting");
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
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Trust Accounting</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The fiduciary premium trust ledger — premiums held for carriers, with a
        running balance.
      </p>
      <TrustPanel entries={entries} />
    </div>
  );
}
