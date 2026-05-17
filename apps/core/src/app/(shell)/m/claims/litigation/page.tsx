import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClaimLitigation } from "@/lib/claim-litigation";
import { listClaims } from "@/lib/claims";
import {
  ClaimLitigationPanel,
  type ClaimLitigationDTO,
  type ClaimOption,
} from "@/components/claim-litigation-panel";

export default async function ClaimLitigationPage() {
  await requireModule("claims");
  const { config } = await loadCurrentTenant();
  const [suitRows, claimRows] = await Promise.all([
    listClaimLitigation(config.id),
    listClaims(config.id),
  ]);

  const suits: ClaimLitigationDTO[] = suitRows.map((s) => ({
    id: s.id,
    claimNumber: s.claimNumber,
    caseCaption: s.caseCaption,
    court: s.court,
    docketNumber: s.docketNumber,
    defenseAttorney: s.defenseAttorney,
    filedDate: s.filedDate,
    trialDate: s.trialDate,
    status: s.status,
  }));
  const claims: ClaimOption[] = claimRows.map((c) => ({
    id: c.id,
    label: `${c.claimNumber} — ${c.clientName}`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/claims"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Claims
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Litigation</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Suits arising from a claim — court, docket, defense counsel, and trial
        date, tracked from pre-suit through resolution.
      </p>
      <ClaimLitigationPanel suits={suits} claims={claims} />
    </div>
  );
}
