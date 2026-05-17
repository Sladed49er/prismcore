import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listRenewals } from "@/lib/renewals";
import { listPolicies } from "@/lib/policies";
import {
  RenewalsPanel,
  type RenewalDTO,
  type PolicyOption,
} from "@/components/renewals-panel";

/** Renewals — the worklist of policies moving toward expiration. */
export default async function RenewalsPage() {
  await requireModule("renewals");
  const { config } = await loadCurrentTenant();

  const [renewalRows, policyRows] = await Promise.all([
    listRenewals(config.id),
    listPolicies(config.id),
  ]);

  const renewals: RenewalDTO[] = renewalRows.map((r) => ({
    id: r.id,
    policyNumber: r.policyNumber,
    clientName: r.clientName,
    lineOfBusiness: r.lineOfBusiness,
    carrier: r.carrier,
    dueDate: r.dueDate,
    stage: r.stage,
    notes: r.notes,
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
      <h1 className="mt-1 text-2xl font-semibold">Renewals</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The renewal worklist — every policy approaching expiration, tracked from
        first touch to bound or lost.
      </p>
      <RenewalsPanel renewals={renewals} policies={policies} />
    </div>
  );
}
