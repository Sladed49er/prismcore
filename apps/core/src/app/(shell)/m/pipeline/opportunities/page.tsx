import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listOpportunities } from "@/lib/pipeline";
import { listClients, clientDisplayName } from "@/lib/clients";
import {
  PipelinePanel,
  type OpportunityDTO,
  type ClientOption,
} from "@/components/pipeline-panel";

/** Opportunity pipeline — new-business and cross-sell, by stage. */
export default async function OpportunitiesPage() {
  await requireModule("pipeline");
  const { config } = await loadCurrentTenant();
  const [opportunityRows, clientRows] = await Promise.all([
    listOpportunities(config.id),
    listClients(config.id),
  ]);

  const opportunities: OpportunityDTO[] = opportunityRows.map((o) => ({
    id: o.id,
    name: o.name,
    clientName: o.clientName,
    valueCents: o.valueCents,
    stage: o.stage,
    expectedCloseDate: o.expectedCloseDate,
  }));
  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    name: clientDisplayName(c),
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/pipeline"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Pipeline
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Opportunity Pipeline</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        New-business and cross-sell opportunities, tracked from first touch to
        won or lost.
      </p>
      <PipelinePanel opportunities={opportunities} clients={clients} />
    </div>
  );
}
