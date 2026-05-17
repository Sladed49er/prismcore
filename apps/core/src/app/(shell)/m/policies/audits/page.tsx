import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listAudits } from "@/lib/audits";
import { listPolicies } from "@/lib/policies";
import {
  AuditsPanel,
  type AuditDTO,
  type PolicyOption,
} from "@/components/audits-panel";

export default async function AuditsPage() {
  await requireModule("policies");
  const { config } = await loadCurrentTenant();
  const [auditRows, policyRows] = await Promise.all([
    listAudits(config.id),
    listPolicies(config.id),
  ]);

  const audits: AuditDTO[] = auditRows.map((a) => ({
    id: a.id,
    policyNumber: a.policyNumber,
    auditType: a.auditType,
    periodStart: a.periodStart,
    periodEnd: a.periodEnd,
    estimatedPremiumCents: a.estimatedPremiumCents,
    auditedPremiumCents: a.auditedPremiumCents,
    adjustmentCents: a.adjustmentCents,
    status: a.status,
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
      <h1 className="mt-3 text-2xl font-semibold">Premium Audits</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        End-of-term premium audits — estimated versus audited premium, with the
        additional or return premium that results.
      </p>
      <AuditsPanel audits={audits} policies={policies} />
    </div>
  );
}
