import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listSurplusLines } from "@/lib/surplus-lines";
import {
  SurplusLinesPanel,
  type SurplusLinesDTO,
} from "@/components/surplus-lines-panel";

export default async function SurplusLinesPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listSurplusLines(config.id);

  const filings: SurplusLinesDTO[] = rows.map((r) => ({
    id: r.id,
    policyReference: r.policyReference,
    state: r.state,
    premiumCents: r.premiumCents,
    taxRatePercent: r.taxRatePercent,
    taxCents: r.taxCents,
    stampingFeeCents: r.stampingFeeCents,
    filingFeeCents: r.filingFeeCents,
    totalDueCents: r.totalDueCents,
    dueDate: r.dueDate,
    status: r.status,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Surplus Lines Tax</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Track surplus-lines premium tax, stamping, and filing fees by state —
        and the filing status of each through to payment.
      </p>
      <SurplusLinesPanel rows={filings} />
    </div>
  );
}
