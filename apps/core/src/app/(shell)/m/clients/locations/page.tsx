import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClientLocations } from "@/lib/client-locations";
import { listClients, clientDisplayName } from "@/lib/clients";
import {
  ClientLocationsPanel,
  type ClientLocationDTO,
  type ClientOption,
} from "@/components/client-locations-panel";

export default async function ClientLocationsPage() {
  await requireModule("clients");
  const { config } = await loadCurrentTenant();
  const [locationRows, clientRows] = await Promise.all([
    listClientLocations(config.id),
    listClients(config.id),
  ]);

  const locations: ClientLocationDTO[] = locationRows.map((l) => ({
    id: l.id,
    clientId: l.clientId,
    clientName: l.clientName,
    label: l.label,
    locationType: l.locationType,
    addressLine: l.addressLine,
    city: l.city,
    state: l.state,
    postalCode: l.postalCode,
  }));
  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    label: clientDisplayName(c),
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/clients"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Clients
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Locations</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The addresses on each client account — mailing, physical, billing, and
        branch locations.
      </p>
      <ClientLocationsPanel locations={locations} clients={clients} />
    </div>
  );
}
