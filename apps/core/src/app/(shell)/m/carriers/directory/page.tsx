import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCarriers } from "@/lib/carriers";
import { CarriersPanel, type CarrierDTO } from "@/components/carriers-panel";

/** Carrier directory — the agency's appointed carriers and markets. */
export default async function CarrierDirectoryPage() {
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
      <Link
        href="/m/carriers"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Carriers
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Carrier Directory</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The agency&rsquo;s appointed carriers and markets — appetite,
        underwriting contacts, and status.
      </p>
      <CarriersPanel carriers={carriers} />
    </div>
  );
}
