import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCampaigns } from "@/lib/campaigns";
import { CampaignsPanel, type CampaignDTO } from "@/components/campaigns-panel";

/**
 * Marketing module — campaigns, channels, and budget.
 *
 * Campaigns are also reachable inside the Pipeline hub (`/m/pipeline/campaigns`);
 * this is the standalone surface for tenants that enable Marketing on its own.
 */
export default async function MarketingPage() {
  await requireModule("marketing");
  const { config } = await loadCurrentTenant();
  const rows = await listCampaigns(config.id);

  const campaigns: CampaignDTO[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel,
    startDate: c.startDate,
    endDate: c.endDate,
    budgetCents: c.budgetCents,
    status: c.status,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Growth
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Marketing</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Outbound marketing campaigns — channel, schedule, and budget, tracked
        from planned through completed.
      </p>
      <CampaignsPanel campaigns={campaigns} />
    </div>
  );
}
