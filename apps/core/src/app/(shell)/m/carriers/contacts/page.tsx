import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCarrierContacts } from "@/lib/carrier-contacts";
import { listCarriers } from "@/lib/carriers";
import {
  CarrierContactsPanel,
  type CarrierContactDTO,
  type CarrierOption,
} from "@/components/carrier-contacts-panel";

export default async function CarrierContactsPage() {
  await requireModule("carriers");
  const { config } = await loadCurrentTenant();
  const [contactRows, carrierRows] = await Promise.all([
    listCarrierContacts(config.id),
    listCarriers(config.id),
  ]);

  const contacts: CarrierContactDTO[] = contactRows.map((c) => ({
    id: c.id,
    carrierName: c.carrierName,
    name: c.name,
    title: c.title,
    role: c.role,
    email: c.email,
    phone: c.phone,
  }));
  const carriers: CarrierOption[] = carrierRows.map((c) => ({
    id: c.id,
    label: c.name,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/carriers"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Carriers
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Carrier Contacts</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The people at each carrier — underwriters, marketing reps, claims and
        billing contacts.
      </p>
      <CarrierContactsPanel contacts={contacts} carriers={carriers} />
    </div>
  );
}
