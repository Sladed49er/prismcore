import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCommissionSplits } from "@/lib/commission-splits";
import { listCommissions } from "@/lib/commissions";
import { listProducers } from "@/lib/producers";
import {
  CommissionSplitsPanel,
  type CommissionSplitDTO,
  type CommissionOption,
  type ProducerOption,
} from "@/components/commission-splits-panel";

export default async function CommissionSplitsPage() {
  await requireModule("commissions");
  const { config } = await loadCurrentTenant();
  const [splitRows, commissionRows, producerRows] = await Promise.all([
    listCommissionSplits(config.id),
    listCommissions(config.id),
    listProducers(config.id),
  ]);

  const splits: CommissionSplitDTO[] = splitRows.map((s) => ({
    id: s.id,
    policyNumber: s.policyNumber,
    commissionAmountCents: s.commissionAmountCents,
    producerName: s.producerName,
    sharePercent: s.sharePercent,
    amountCents: s.amountCents,
  }));
  const commissions: CommissionOption[] = commissionRows.map((c) => ({
    id: c.id,
    label: `${c.policyNumber} — ${c.clientName} ($${(c.amountCents / 100).toLocaleString()})`,
  }));
  const producers: ProducerOption[] = producerRows
    .filter((p) => p.status === "active")
    .map((p) => ({ id: p.id, label: p.name }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/commissions"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Commissions
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Commission Splits</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        How each commission is shared among producers — by percentage and
        dollar amount.
      </p>
      <CommissionSplitsPanel
        splits={splits}
        commissions={commissions}
        producers={producers}
      />
    </div>
  );
}
