import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCarriers } from "@/lib/carriers";
import { CarriersPanel, type CarrierDTO } from "@/components/carriers-panel";

/** Carriers — the agency's appointed carriers and markets. */
export default async function CarriersPage() {
  await requireModule("carriers");
  const { config } = await loadCurrentTenant();
  const rows = await listCarriers(config.id);

  const carriers: CarrierDTO[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    naicCode: c.naicCode,
    appetite: c.appetite,
    contactName: c.contactName,
    contactEmail: c.contactEmail,
    status: c.status,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Carriers</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Your appointed carriers and markets — appetite, underwriting contacts,
        and status.
      </p>
      <CarriersPanel carriers={carriers} />
    </div>
  );
}
