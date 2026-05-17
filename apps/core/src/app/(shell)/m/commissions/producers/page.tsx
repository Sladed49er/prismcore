import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listProducers } from "@/lib/producers";
import {
  ProducersPanel,
  type ProducerDTO,
} from "@/components/producers-panel";

export default async function ProducersPage() {
  await requireModule("commissions");
  const { config } = await loadCurrentTenant();
  const rows = await listProducers(config.id);

  const producers: ProducerDTO[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    email: p.email,
    defaultRatePercent: p.defaultRatePercent,
    status: p.status,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/commissions"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Commissions
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Producers</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The producer master — the agents who write business and receive
        commission splits and payouts.
      </p>
      <ProducersPanel producers={producers} />
    </div>
  );
}
