import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listPolicies } from "@/lib/policies";
import { listClients, clientDisplayName } from "@/lib/clients";
import { listCustomFields } from "@/lib/customization";
import {
  PoliciesPanel,
  type PolicyDTO,
  type ClientOption,
  type CustomFieldDTO,
} from "@/components/policies-panel";

/** Policy register — every policy on the book, written on a client. */
export default async function PolicyRegisterPage() {
  await requireModule("policies");
  const { config } = await loadCurrentTenant();

  const [policyRows, clientRows, fieldRows] = await Promise.all([
    listPolicies(config.id),
    listClients(config.id),
    listCustomFields(config.id),
  ]);

  const policies: PolicyDTO[] = policyRows.map((p) => ({
    id: p.id,
    policyNumber: p.policyNumber,
    clientName: p.clientName,
    lineOfBusiness: p.lineOfBusiness,
    carrier: p.carrier,
    status: p.status,
    expirationDate: p.expirationDate,
    premiumCents: p.premiumCents,
  }));
  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    name: clientDisplayName(c),
  }));
  const customFields: CustomFieldDTO[] = fieldRows
    .filter((f) => f.entityKey === "policy")
    .map((f) => ({
      fieldKey: f.fieldKey,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
    }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/policies"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Policies
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Policy Register</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Every policy on the book — written on a client, tracked through its
        lifecycle.
      </p>
      <PoliciesPanel
        policies={policies}
        clients={clients}
        customFields={customFields}
      />
    </div>
  );
}
