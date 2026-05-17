import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCancellations } from "@/lib/cancellations";
import { listPolicies } from "@/lib/policies";
import {
  CancellationsPanel,
  type CancellationDTO,
  type PolicyOption,
} from "@/components/cancellations-panel";

export default async function CancellationsPage() {
  await requireModule("policies");
  const { config } = await loadCurrentTenant();
  const [canRows, policyRows] = await Promise.all([
    listCancellations(config.id),
    listPolicies(config.id),
  ]);

  const cancellations: CancellationDTO[] = canRows.map((c) => ({
    id: c.id,
    policyNumber: c.policyNumber,
    requestDate: c.requestDate,
    effectiveDate: c.effectiveDate,
    reason: c.reason,
    cancellationType: c.cancellationType,
    returnPremiumCents: c.returnPremiumCents,
    status: c.status,
  }));
  const policies: PolicyOption[] = policyRows.map((p) => ({
    id: p.id,
    label: `${p.policyNumber}${p.lineOfBusiness ? ` — ${p.lineOfBusiness}` : ""}`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/policies"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Policies
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Cancellations</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Cancellation requests tracked through processing — flat, pro-rata, or
        short-rate, with return premium and the option to reinstate.
      </p>
      <CancellationsPanel
        cancellations={cancellations}
        policies={policies}
      />
    </div>
  );
}
