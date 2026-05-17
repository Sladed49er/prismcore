import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClaimRecoveries } from "@/lib/claim-recoveries";
import { listClaims } from "@/lib/claims";
import {
  ClaimRecoveriesPanel,
  type ClaimRecoveryDTO,
  type ClaimOption,
} from "@/components/claim-recoveries-panel";

export default async function ClaimRecoveriesPage() {
  await requireModule("claims");
  const { config } = await loadCurrentTenant();
  const [recoveryRows, claimRows] = await Promise.all([
    listClaimRecoveries(config.id),
    listClaims(config.id),
  ]);

  const recoveries: ClaimRecoveryDTO[] = recoveryRows.map((r) => ({
    id: r.id,
    claimNumber: r.claimNumber,
    recoveryType: r.recoveryType,
    description: r.description,
    expectedCents: r.expectedCents,
    recoveredCents: r.recoveredCents,
    recoveryDate: r.recoveryDate,
    status: r.status,
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
      <h1 className="mt-3 text-2xl font-semibold">Recovery &amp; Subrogation</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Money pursued back to the claim file — subrogation, salvage, and
        deductible recovery, tracked from pursuit to recovered.
      </p>
      <ClaimRecoveriesPanel recoveries={recoveries} claims={claims} />
    </div>
  );
}
