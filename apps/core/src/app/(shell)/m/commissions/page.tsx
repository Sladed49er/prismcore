import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCommissions } from "@/lib/commissions";
import { listPolicies } from "@/lib/policies";
import {
  CommissionsPanel,
  type CommissionDTO,
  type PolicyOption,
} from "@/components/commissions-panel";

export default async function CommissionsPage() {
  await requireModule("commissions");
  const { config } = await loadCurrentTenant();
  const [commissionRows, policyRows] = await Promise.all([
    listCommissions(config.id),
    listPolicies(config.id),
  ]);

  const commissions: CommissionDTO[] = commissionRows.map((c) => ({
    id: c.id,
    policyNumber: c.policyNumber,
    clientName: c.clientName,
    amountCents: c.amountCents,
    ratePercent: c.ratePercent,
    status: c.status,
    receivedDate: c.receivedDate,
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
      <h1 className="mt-1 text-2xl font-semibold">Commissions</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Commission records tracked from earned through reconciled.
      </p>
      <CommissionsPanel commissions={commissions} policies={policies} />
    </div>
  );
}
