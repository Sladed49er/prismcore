import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listContracts, listContractDocuments } from "@/lib/contracts";
import { ContractsPanel, type ContractDTO } from "@/components/contracts-panel";
import {
  ContractDocumentsPanel,
  type ContractDocumentDTO,
  type ContractOption,
} from "@/components/contract-documents-panel";

/**
 * Contracts module — the agency's vendor agreements and the documents
 * attached to each.
 */
export default async function ContractsPage() {
  await requireModule("contracts");
  const { config } = await loadCurrentTenant();
  const [contractRows, documentRows] = await Promise.all([
    listContracts(config.id),
    listContractDocuments(config.id),
  ]);

  const contracts: ContractDTO[] = contractRows.map((c) => ({
    id: c.id,
    vendorName: c.vendorName,
    title: c.title,
    category: c.category,
    status: c.status,
    startDate: c.startDate,
    endDate: c.endDate,
    annualValueCents: c.annualValueCents,
    autoRenew: c.autoRenew,
    noticePeriodDays: c.noticePeriodDays,
    ownerName: c.ownerName,
    notes: c.notes,
  }));

  const documents: ContractDocumentDTO[] = documentRows.map((d) => ({
    id: d.id,
    contractLabel: d.contractLabel,
    name: d.name,
    docType: d.docType,
    url: d.url,
    notes: d.notes,
  }));

  const contractOptions: ContractOption[] = contractRows.map((c) => ({
    id: c.id,
    name: [c.vendorName, c.title].filter(Boolean).join(" — "),
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Contracts</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The agency&rsquo;s vendor agreements — renewal dates, notice periods,
        annual spend — and the documents behind each.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Contracts</h2>
      <ContractsPanel contracts={contracts} />

      <h2 className="mt-10 text-lg font-semibold">Documents</h2>
      <p className="mt-1 text-sm text-gray-500">
        Agreements, amendments, COIs, and related files, linked to a contract.
      </p>
      <ContractDocumentsPanel
        documents={documents}
        contracts={contractOptions}
      />
    </div>
  );
}
