import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listReserveEntries } from "@/lib/claim-reserves";
import { listClaims } from "@/lib/claims";
import {
  ReservesPanel,
  type ReserveEntryDTO,
  type ClaimOption,
} from "@/components/reserves-panel";

export default async function ReservesPage() {
  await requireModule("claims");
  const { config } = await loadCurrentTenant();
  const [entryRows, claimRows] = await Promise.all([
    listReserveEntries(config.id),
    listClaims(config.id),
  ]);

  const entries: ReserveEntryDTO[] = entryRows.map((e) => ({
    id: e.id,
    claimNumber: e.claimNumber,
    entryDate: e.entryDate,
    reserveType: e.reserveType,
    changeCents: e.changeCents,
    reason: e.reason,
  }));
  const claims: ClaimOption[] = claimRows.map((c) => ({
    id: c.id,
    label: `${c.claimNumber} — ${c.clientName}`,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/claims"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Claims
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Reserves</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The reserve-change ledger — every set, raise, and release of indemnity,
        expense, legal, and medical reserves.
      </p>
      <ReservesPanel entries={entries} claims={claims} />
    </div>
  );
}
