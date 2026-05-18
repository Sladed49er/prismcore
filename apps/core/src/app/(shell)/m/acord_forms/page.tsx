import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";
import { listAcordForms, ACORD_FORMS, formFields } from "@/lib/acord";
import { listClients, clientDisplayName } from "@/lib/clients";
import { listPolicies } from "@/lib/policies";
import {
  AcordPanel,
  type AcordFormDTO,
  type ClientOption,
  type PolicyOption,
  type FormCatalogEntry,
} from "@/components/acord-panel";

/** ACORD Forms — prepare and prefill standard ACORD applications. */
export default async function AcordFormsPage() {
  await requireModule("acord_forms");
  const { config } = await loadCurrentTenant();
  const [terms, formRows, clientRows, policyRows] = await Promise.all([
    loadTerms(config.id),
    listAcordForms(config.id),
    listClients(config.id),
    listPolicies(config.id),
  ]);

  const forms: AcordFormDTO[] = formRows.map((f) => ({
    id: f.id,
    formType: f.formType,
    clientName: f.clientName,
    status: f.status,
    notes: f.notes,
    fieldValues: f.fieldValues,
  }));
  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    name: clientDisplayName(c),
  }));
  const policies: PolicyOption[] = policyRows.map((p) => ({
    id: p.id,
    label: `${p.policyNumber} — ${p.clientName}`,
  }));
  const catalog: FormCatalogEntry[] = ACORD_FORMS.map((f) => ({
    type: f.type,
    name: f.name,
    description: f.description,
    fields: formFields(f.type),
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "acord_forms", "ACORD Forms")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Prepare standard ACORD applications and certificates — fields prefill
        from the client and policy, then you review and complete.
      </p>
      <AcordPanel
        forms={forms}
        clients={clients}
        policies={policies}
        catalog={catalog}
      />
    </div>
  );
}
