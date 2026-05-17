import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listLeads } from "@/lib/leads";
import { LeadsPanel, type LeadDTO } from "@/components/leads-panel";

export default async function LeadsPage() {
  await requireModule("pipeline");
  const { config } = await loadCurrentTenant();
  const rows = await listLeads(config.id);

  const leads: LeadDTO[] = rows.map((l) => ({
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

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/pipeline"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Pipeline
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Leads</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Inbound prospects worked from first contact through qualified — convert
        the good ones into pipeline opportunities.
      </p>
      <LeadsPanel leads={leads} />
    </div>
  );
}
