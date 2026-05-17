import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listProducerPayouts } from "@/lib/producer-payouts";
import { listProducers } from "@/lib/producers";
import {
  ProducerPayoutsPanel,
  type ProducerPayoutDTO,
  type ProducerOption,
} from "@/components/producer-payouts-panel";

export default async function ProducerPayoutsPage() {
  await requireModule("commissions");
  const { config } = await loadCurrentTenant();
  const [payoutRows, producerRows] = await Promise.all([
    listProducerPayouts(config.id),
    listProducers(config.id),
  ]);

  const payouts: ProducerPayoutDTO[] = payoutRows.map((p) => ({
    id: p.id,
    producerName: p.producerName,
    payoutDate: p.payoutDate,
    periodLabel: p.periodLabel,
    amountCents: p.amountCents,
    method: p.method,
    status: p.status,
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
      <h1 className="mt-3 text-2xl font-semibold">Producer Payouts</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Commission payouts to producers — scheduled and marked paid as each
        run goes out.
      </p>
      <ProducerPayoutsPanel payouts={payouts} producers={producers} />
    </div>
  );
}
