import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCampaigns } from "@/lib/campaigns";
import { listTemplates } from "@/lib/marketing-engine";
import { CampaignsPanel, type CampaignDTO } from "@/components/campaigns-panel";
import { MarketingBlastPanel } from "@/components/marketing-blast-panel";

/**
 * Marketing module — campaigns, email templates, drip sequences, and real
 * email send.
 *
 * Campaigns are also reachable inside the Pipeline hub (`/m/pipeline/campaigns`);
 * this is the standalone surface for tenants that enable Marketing on its own.
 */
export default async function MarketingPage() {
  await requireModule("marketing");
  const { config } = await loadCurrentTenant();
  const [rows, templateRows] = await Promise.all([
    listCampaigns(config.id),
    listTemplates(config.id),
  ]);

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
        Outbound marketing — campaigns, reusable email templates, drip
        sequences, and real email send.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/m/marketing/templates"
          className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300"
        >
          <h3 className="font-semibold">Email Templates</h3>
          <p className="mt-1 text-sm text-gray-600">
            Reusable subject + HTML body, with merge fields.
          </p>
        </Link>
        <Link
          href="/m/marketing/sequences"
          className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300"
        >
          <h3 className="font-semibold">Drip Sequences</h3>
          <p className="mt-1 text-sm text-gray-600">
            Multi-step template sends, advanced daily.
          </p>
        </Link>
      </div>

      <MarketingBlastPanel
        campaigns={campaigns.map((c) => ({ id: c.id, label: c.name }))}
        templates={templateRows.map((t) => ({ id: t.id, label: t.name }))}
      />

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Campaigns
      </h2>
      <CampaignsPanel campaigns={campaigns} />
    </div>
  );
}
