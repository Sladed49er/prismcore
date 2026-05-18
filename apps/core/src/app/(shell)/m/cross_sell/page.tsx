import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClients, clientDisplayName } from "@/lib/clients";
import { listCrossSellOpportunities } from "@/lib/cross-sell";
import {
  CrossSellPanel,
  type CrossSellOpportunityDTO,
  type ClientOption,
} from "@/components/cross-sell-panel";

/**
 * Cross-Sell module — AI book analysis that finds the lines each existing
 * client is missing, plus hand-added opportunities, worked to won.
 */
export default async function CrossSellPage() {
  await requireModule("cross_sell");
  const { config } = await loadCurrentTenant();
  const [opportunityRows, clientRows] = await Promise.all([
    listCrossSellOpportunities(config.id),
    listClients(config.id),
  ]);

  const opportunities: CrossSellOpportunityDTO[] = opportunityRows.map((o) => ({
    id: o.id,
    clientName: o.clientName,
    line: o.line,
    rationale: o.rationale,
    estimatedPremiumCents: o.estimatedPremiumCents,
    confidence: o.confidence,
    status: o.status,
    source: o.source,
  }));

  const clients: ClientOption[] = clientRows
    .filter((c) => c.status !== "inactive")
    .map((c) => ({ id: c.id, name: clientDisplayName(c) }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Cross-Sell</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Find the coverage gaps in your book. The AI analysis reads each
        client&rsquo;s active lines and flags what they&rsquo;re missing — then
        work each opportunity from suggested to won.
      </p>
      <CrossSellPanel opportunities={opportunities} clients={clients} />
    </div>
  );
}
