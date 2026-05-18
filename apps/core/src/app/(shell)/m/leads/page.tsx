import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listLeads } from "@/lib/leads";
import { listLeadSources } from "@/lib/lead-sources";
import { LeadsPanel, type LeadDTO } from "@/components/leads-panel";
import {
  LeadSourcesPanel,
  type LeadSourceDTO,
} from "@/components/lead-sources-panel";

/**
 * PrismLeads module — inbound prospects and the channels they came from.
 *
 * Leads and sources are also reachable inside the Pipeline hub; this is the
 * standalone surface for tenants that enable Leads on its own.
 */
export default async function LeadsPage() {
  await requireModule("leads");
  const { config } = await loadCurrentTenant();
  const [leadRows, sourceRows] = await Promise.all([
    listLeads(config.id),
    listLeadSources(config.id),
  ]);

  const leads: LeadDTO[] = leadRows.map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    email: l.email,
    phone: l.phone,
    source: l.source,
    lineOfBusiness: l.lineOfBusiness,
    estimatedValueCents: l.estimatedValueCents,
    status: l.status,
  }));

  const sources: LeadSourceDTO[] = sourceRows.map((s) => ({
    id: s.id,
    name: s.name,
    sourceType: s.sourceType,
    description: s.description,
    isActive: s.isActive,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Growth
      </p>
      <h1 className="mt-1 text-2xl font-semibold">PrismLeads</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Inbound prospects worked from first contact through qualified, each
        attributed to the marketing channel that brought it in.
      </p>
      <LeadsPanel leads={leads} />

      <h2 className="mt-10 text-lg font-semibold">Lead Sources</h2>
      <p className="mt-1 max-w-2xl text-sm text-gray-600">
        The channels that bring in business — referrals, web, partners, events.
      </p>
      <LeadSourcesPanel sources={sources} />
    </div>
  );
}
