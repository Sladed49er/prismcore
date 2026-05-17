import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClaims } from "@/lib/claims";
import { listPolicies } from "@/lib/policies";
import {
  ClaimsPanel,
  type ClaimDTO,
  type PolicyOption,
} from "@/components/claims-panel";

export default async function ClaimsPage() {
  await requireModule("claims");
  const { config } = await loadCurrentTenant();
  const [claimRows, policyRows] = await Promise.all([
    listClaims(config.id),
    listPolicies(config.id),
  ]);

  const claims: ClaimDTO[] = claimRows.map((c) => ({
    id: c.id,
    claimNumber: c.claimNumber,
    policyNumber: c.policyNumber,
    clientName: c.clientName,
    dateOfLoss: c.dateOfLoss,
    status: c.status,
    reserveCents: c.reserveCents,
  }));
  const policies: PolicyOption[] = policyRows.map((p) => ({
    id: p.id,
    label: `${p.policyNumber} — ${p.clientName}`,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Claims</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Claims filed against the book — tracked from first notice through
        settlement.
      </p>
      <ClaimsPanel claims={claims} policies={policies} />
    </div>
  );
}
