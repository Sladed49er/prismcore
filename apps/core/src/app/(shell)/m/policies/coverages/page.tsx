import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCoverages } from "@/lib/coverages";
import { listPolicies } from "@/lib/policies";
import {
  CoveragesPanel,
  type CoverageDTO,
  type PolicyOption,
} from "@/components/coverages-panel";

export default async function CoveragesPage() {
  await requireModule("policies");
  const { config } = await loadCurrentTenant();
  const [covRows, policyRows] = await Promise.all([
    listCoverages(config.id),
    listPolicies(config.id),
  ]);

  const coverages: CoverageDTO[] = covRows.map((c) => ({
    id: c.id,
    policyNumber: c.policyNumber,
    coverageType: c.coverageType,
    limitText: c.limitText,
    deductibleCents: c.deductibleCents,
    premiumCents: c.premiumCents,
    notes: c.notes,
  }));
  const policies: PolicyOption[] = policyRows.map((p) => ({
    id: p.id,
    label: `${p.policyNumber}${p.lineOfBusiness ? ` — ${p.lineOfBusiness}` : ""}`,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/policies"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Policies
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Coverages</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The coverage lines written on each policy — limits, deductibles, and
        the premium allocated to each.
      </p>
      <CoveragesPanel coverages={coverages} policies={policies} />
    </div>
  );
}
