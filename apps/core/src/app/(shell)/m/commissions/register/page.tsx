import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCommissions } from "@/lib/commissions";
import { listPolicies } from "@/lib/policies";
import {
  CommissionsPanel,
  type CommissionDTO,
  type PolicyOption,
} from "@/components/commissions-panel";

/** Commission register — every commission earned, by policy. */
export default async function CommissionRegisterPage() {
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
      <Link
        href="/m/commissions"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Commissions
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Commission Register</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Every commission earned on the book — tracked from earned through
        received and reconciled.
      </p>
      <CommissionsPanel commissions={commissions} policies={policies} />
    </div>
  );
}
