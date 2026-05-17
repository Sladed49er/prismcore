import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCampaigns } from "@/lib/campaigns";
import {
  CampaignsPanel,
  type CampaignDTO,
} from "@/components/campaigns-panel";

export default async function CampaignsPage() {
  await requireModule("pipeline");
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
      <Link
        href="/m/pipeline"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Pipeline
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Campaigns</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Outbound marketing campaigns — channel, schedule, and budget, tracked
        from planned through completed.
      </p>
      <CampaignsPanel campaigns={campaigns} />
    </div>
  );
}
