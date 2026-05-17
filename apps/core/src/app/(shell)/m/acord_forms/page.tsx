import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listAcordForms } from "@/lib/acord";
import { listClients, clientDisplayName } from "@/lib/clients";
import {
  AcordPanel,
  type AcordFormDTO,
  type ClientOption,
} from "@/components/acord-panel";

export default async function AcordFormsPage() {
  await requireModule("acord_forms");
  const { config } = await loadCurrentTenant();
  const [formRows, clientRows] = await Promise.all([
    listAcordForms(config.id),
    listClients(config.id),
  ]);

  const forms: AcordFormDTO[] = formRows.map((f) => ({
    id: f.id,
    formType: f.formType,
    clientName: f.clientName,
    notes: f.notes,
    status: f.status,
  }));
  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    name: clientDisplayName(c),
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">ACORD Forms</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        ACORD applications and supplemental forms prepared for clients.
      </p>
      <AcordPanel forms={forms} clients={clients} />
    </div>
  );
}
