import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClientContacts } from "@/lib/client-contacts";
import { listClients, clientDisplayName } from "@/lib/clients";
import {
  ClientContactsPanel,
  type ClientContactDTO,
  type ClientOption,
} from "@/components/client-contacts-panel";

export default async function ClientContactsPage() {
  await requireModule("clients");
  const { config } = await loadCurrentTenant();
  const [contactRows, clientRows] = await Promise.all([
    listClientContacts(config.id),
    listClients(config.id),
  ]);

  const contacts: ClientContactDTO[] = contactRows.map((c) => ({
    id: c.id,
    clientId: c.clientId,
    clientName: c.clientName,
    name: c.name,
    title: c.title,
    email: c.email,
    phone: c.phone,
    role: c.role,
    notes: c.notes,
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
      <h1 className="mt-3 text-2xl font-semibold">Contacts</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The people at each client account — primary, billing, and claims
        contacts, decision-makers, and everyone else worth knowing.
      </p>
      <ClientContactsPanel contacts={contacts} clients={clients} />
    </div>
  );
}
