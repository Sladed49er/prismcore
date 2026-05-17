import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listRemarketingQuotes } from "@/lib/remarketing";
import { listRenewals } from "@/lib/renewals";
import {
  RemarketingPanel,
  type RemarketingQuoteDTO,
  type RenewalOption,
} from "@/components/remarketing-panel";

export default async function RemarketingPage() {
  await requireModule("renewals");
  const { config } = await loadCurrentTenant();
  const [quoteRows, renewalRows] = await Promise.all([
    listRemarketingQuotes(config.id),
    listRenewals(config.id),
  ]);

  const quotes: RemarketingQuoteDTO[] = quoteRows.map((q) => ({
    id: q.id,
    policyNumber: q.policyNumber,
    clientName: q.clientName,
    carrierName: q.carrierName,
    quotedPremiumCents: q.quotedPremiumCents,
    coverageSummary: q.coverageSummary,
    status: q.status,
  }));
  const renewals: RenewalOption[] = renewalRows.map((r) => ({
    id: r.id,
    label: `${r.policyNumber} — ${r.clientName}`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/renewals"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Renewals
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Remarketing</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The remarketing worksheet — carrier quotes gathered while shopping a
        renewal, compared side by side.
      </p>
      <RemarketingPanel quotes={quotes} renewals={renewals} />
    </div>
  );
}
