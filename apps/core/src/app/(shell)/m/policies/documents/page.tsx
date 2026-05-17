import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listPolicyDocuments } from "@/lib/policy-documents";
import { listPolicies } from "@/lib/policies";
import {
  PolicyDocumentsPanel,
  type PolicyDocumentDTO,
  type PolicyOption,
} from "@/components/policy-documents-panel";

export default async function PolicyDocumentsPage() {
  await requireModule("policies");
  const { config } = await loadCurrentTenant();
  const [docRows, policyRows] = await Promise.all([
    listPolicyDocuments(config.id),
    listPolicies(config.id),
  ]);

  const documents: PolicyDocumentDTO[] = docRows.map((d) => ({
    id: d.id,
    policyNumber: d.policyNumber,
    documentType: d.documentType,
    title: d.title,
    reference: d.reference,
    issuedDate: d.issuedDate,
    notes: d.notes,
  }));
  const policies: PolicyOption[] = policyRows.map((p) => ({
    id: p.id,
    label: `${p.policyNumber}${p.lineOfBusiness ? ` — ${p.lineOfBusiness}` : ""}`,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/policies"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Policies
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">ID Cards &amp; Documents</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Policy paperwork on file — ID cards, dec pages, certificates, and
        applications, each tied to its policy.
      </p>
      <PolicyDocumentsPanel documents={documents} policies={policies} />
    </div>
  );
}
