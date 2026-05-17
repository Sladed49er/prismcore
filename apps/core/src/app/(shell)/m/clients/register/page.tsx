import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClients } from "@/lib/clients";
import { listCustomFields } from "@/lib/customization";
import {
  ClientsPanel,
  type ClientDTO,
  type CustomFieldDTO,
} from "@/components/clients-panel";

/** Client register — the CRM record list, with the tenant's custom fields. */
export default async function ClientRegisterPage() {
  await requireModule("clients");
  const { config } = await loadCurrentTenant();

  const [clientRows, fieldRows] = await Promise.all([
    listClients(config.id),
    listCustomFields(config.id),
  ]);

  const clients: ClientDTO[] = clientRows.map((c) => {
    const personName = [c.firstName, c.lastName].filter(Boolean).join(" ");
    const displayName =
      c.type === "business"
        ? (c.businessName ?? "Unnamed business")
        : personName || c.email || "Unnamed contact";
    const location = [c.city, c.state].filter(Boolean).join(", ") || null;
    return {
      id: c.id,
      type: c.type,
      displayName,
      email: c.email,
      phone: c.phone,
      location,
      status: c.status,
    };
  });

  const customFields: CustomFieldDTO[] = fieldRows
    .filter((f) => f.entityKey === "client")
    .map((f) => ({
      fieldKey: f.fieldKey,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
    }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/clients"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Clients
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Client Register</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The client record at the center of the workspace. The form includes any
        custom fields you have defined in Customize.
      </p>
      <ClientsPanel clients={clients} customFields={customFields} />
    </div>
  );
}
