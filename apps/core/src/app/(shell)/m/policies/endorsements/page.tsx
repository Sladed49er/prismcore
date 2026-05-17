import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listEndorsements } from "@/lib/endorsements";
import { listPolicies } from "@/lib/policies";
import {
  EndorsementsPanel,
  type EndorsementDTO,
  type PolicyOption,
} from "@/components/endorsements-panel";

export default async function EndorsementsPage() {
  await requireModule("policies");
  const { config } = await loadCurrentTenant();
  const [endRows, policyRows] = await Promise.all([
    listEndorsements(config.id),
    listPolicies(config.id),
  ]);

  const endorsements: EndorsementDTO[] = endRows.map((e) => ({
    id: e.id,
    policyNumber: e.policyNumber,
    endorsementNumber: e.endorsementNumber,
    effectiveDate: e.effectiveDate,
    description: e.description,
    premiumChangeCents: e.premiumChangeCents,
    status: e.status,
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
      <h1 className="mt-3 text-2xl font-semibold">Endorsements</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Mid-term changes to a policy — each with an effective date and the
        premium it adds or returns.
      </p>
      <EndorsementsPanel endorsements={endorsements} policies={policies} />
    </div>
  );
}
