import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listEstimates } from "@/lib/estimates";
import { listClients, clientDisplayName } from "@/lib/clients";
import {
  EstimatesPanel,
  type EstimateDTO,
  type ClientOption,
} from "@/components/estimates-panel";

export default async function EstimatesPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const [estimateRows, clientRows] = await Promise.all([
    listEstimates(config.id),
    listClients(config.id),
  ]);

  const estimates: EstimateDTO[] = estimateRows.map((e) => ({
    id: e.id,
    estimateNumber: e.estimateNumber,
    clientName: e.clientName,
    description: e.description,
    amountCents: e.amountCents,
    status: e.status,
    validUntil: e.validUntil,
  }));
  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    name: clientDisplayName(c),
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Estimates</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Quotes and estimates issued to clients — drafted, sent, and converted.
      </p>
      <EstimatesPanel estimates={estimates} clients={clients} />
    </div>
  );
}
