import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listLeadSources } from "@/lib/lead-sources";
import {
  LeadSourcesPanel,
  type LeadSourceDTO,
} from "@/components/lead-sources-panel";

export default async function LeadSourcesPage() {
  await requireModule("pipeline");
  const { config } = await loadCurrentTenant();
  const rows = await listLeadSources(config.id);

  const sources: LeadSourceDTO[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    sourceType: s.sourceType,
    description: s.description,
    isActive: s.isActive,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/pipeline"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Pipeline
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Lead Sources</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The marketing channels that bring in business — referrals, web,
        partners, events — so every lead can be attributed.
      </p>
      <LeadSourcesPanel sources={sources} />
    </div>
  );
}
