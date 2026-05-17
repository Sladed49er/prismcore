import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClaimParties } from "@/lib/claim-parties";
import { listClaims } from "@/lib/claims";
import {
  ClaimPartiesPanel,
  type ClaimPartyDTO,
  type ClaimOption,
} from "@/components/claim-parties-panel";

export default async function ClaimPartiesPage() {
  await requireModule("claims");
  const { config } = await loadCurrentTenant();
  const [partyRows, claimRows] = await Promise.all([
    listClaimParties(config.id),
    listClaims(config.id),
  ]);

  const parties: ClaimPartyDTO[] = partyRows.map((p) => ({
    id: p.id,
    claimNumber: p.claimNumber,
    role: p.role,
    name: p.name,
    organization: p.organization,
    phone: p.phone,
    email: p.email,
    notes: p.notes,
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
      <h1 className="mt-3 text-2xl font-semibold">Claim Parties</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Everyone involved in a claim — claimants, witnesses, adjusters,
        attorneys, experts, and third parties, with their contact details.
      </p>
      <ClaimPartiesPanel parties={parties} claims={claims} />
    </div>
  );
}
